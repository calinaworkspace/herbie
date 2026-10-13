import { eq, desc, and, lt } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { walletTransactions, paymentMethods } from "../../db/schema";

/** Lazily settle "processing" transactions older than 3 minutes */
async function settle(userId: number) {
  const db = getDb();
  const cutoff = new Date(Date.now() - 3 * 60 * 1000);
  await db.update(walletTransactions).set({ status: "completed" })
    .where(and(
      eq(walletTransactions.userId, userId),
      eq(walletTransactions.status, "processing"),
      lt(walletTransactions.createdAt, cutoff),
    ));
}

function computeBalances(txns: { direction: string; amount: number; status: string }[]) {
  let available = 0, pendingIn = 0, processing = 0;
  for (const t of txns) {
    if (t.status === "failed") continue;
    if (t.direction === "in") {
      if (t.status === "completed") available += t.amount;
      else pendingIn += t.amount;
    } else {
      if (t.status === "completed") available -= t.amount;
      else if (t.status === "processing") { available -= t.amount; processing += t.amount; }
    }
  }
  return { available, pendingIn, processing };
}

export const walletRouter = createRouter({
  overview: authedQuery.query(async ({ ctx }) => {
    await settle(ctx.user.id);
    const db = getDb();
    const txns = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, ctx.user.id))
      .orderBy(desc(walletTransactions.createdAt)).limit(200);
    const methods = await db.select().from(paymentMethods)
      .where(eq(paymentMethods.userId, ctx.user.id)).orderBy(desc(paymentMethods.isPrimary));
    const balances = computeBalances(txns);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const thisMonth = txns.filter((t) => t.createdAt >= monthStart && t.status === "completed");
    const monthIn = thisMonth.filter((t) => t.direction === "in").reduce((a, t) => a + t.amount, 0);
    const monthOut = thisMonth.filter((t) => t.direction === "out").reduce((a, t) => a + t.amount, 0);
    return { transactions: txns, methods, ...balances, monthIn, monthOut };
  }),

  addMethod: authedQuery.input(z.object({
    kind: z.enum(["bank", "card", "ewallet"]),
    label: z.string().min(2).max(120),
    detail: z.string().min(2).max(120),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const existing = await db.select().from(paymentMethods).where(eq(paymentMethods.userId, ctx.user.id));
    await db.insert(paymentMethods).values({
      userId: ctx.user.id, kind: input.kind, label: input.label, detail: input.detail,
      isPrimary: existing.length === 0,
    });
    return { ok: true };
  }),

  removeMethod: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.delete(paymentMethods).where(and(eq(paymentMethods.id, input.id), eq(paymentMethods.userId, ctx.user.id)));
    return { ok: true };
  }),

  setPrimary: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db.update(paymentMethods).set({ isPrimary: false }).where(eq(paymentMethods.userId, ctx.user.id));
    await db.update(paymentMethods).set({ isPrimary: true })
      .where(and(eq(paymentMethods.id, input.id), eq(paymentMethods.userId, ctx.user.id)));
    return { ok: true };
  }),

  topUp: authedQuery.input(z.object({ amount: z.number().int().min(1).max(1000000), methodId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      let via = "Linked account";
      if (input.methodId) {
        const [m] = await db.select().from(paymentMethods).where(and(eq(paymentMethods.id, input.methodId), eq(paymentMethods.userId, ctx.user.id))).limit(1);
        if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Payment method not found" });
        via = m.label;
      }
      await db.insert(walletTransactions).values({
        userId: ctx.user.id, direction: "in", amount: input.amount, fee: 0,
        counterparty: `Top-up — ${via}`, category: "topup", status: "processing",
        note: "Funds on the way — usually completes within minutes",
      });
      return { ok: true };
    }),

  withdraw: authedQuery.input(z.object({ amount: z.number().int().min(1).max(1000000), methodId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await settle(ctx.user.id);
      const [m] = await db.select().from(paymentMethods).where(and(eq(paymentMethods.id, input.methodId), eq(paymentMethods.userId, ctx.user.id))).limit(1);
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Payment method not found" });
      const txns = await db.select().from(walletTransactions).where(eq(walletTransactions.userId, ctx.user.id));
      const { available } = computeBalances(txns);
      if (input.amount > available) throw new TRPCError({ code: "BAD_REQUEST", message: `Insufficient balance (available: $${available})` });
      await db.insert(walletTransactions).values({
        userId: ctx.user.id, direction: "out", amount: input.amount, fee: 0,
        counterparty: `Withdraw — ${m.label}`, category: "withdraw", status: "processing",
        note: `To ${m.detail}`,
      });
      return { ok: true };
    }),
});
