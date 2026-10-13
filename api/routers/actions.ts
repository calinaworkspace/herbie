import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import {
  profiles, startups, freelancers, jobs, products, applications, orders,
  investments, walletTransactions, notificationsTable, reactions, conversations, messages, quickJobs,
} from "../../db/schema";
import { rankForXp, XP_REWARDS } from "@contracts/herbie";

async function awardXp(userId: number, amount: number, reason: string) {
  const db = getDb();
  await db.update(profiles).set({ xp: sql`xp + ${amount}` }).where(eq(profiles.userId, userId));
  await db.insert(notificationsTable).values({
    userId, kind: "system", title: `+${amount} XP — ${reason}`,
    body: "XP unlocks higher Herbie ranks, lower fees, and more visibility.",
  });
}

async function getProfile(userId: number) {
  const [p] = await getDb().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!p) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete onboarding first" });
  return p;
}

const CANNED_REPLIES = [
  "Thanks for reaching out! We'd love to tell you more — what would you like to know?",
  "Great to hear from you! Feel free to apply — we're reviewing candidates this week.",
  "Hi! Happy to share details. Our team typically replies within a day.",
  "Hello! Yes, that role is still open. Send your application and we'll be in touch!",
];

export const actionsRouter = createRouter({
  /** Like / save toggle on any target */
  react: authedQuery.input(z.object({
    targetType: z.enum(["job", "startup", "freelancer", "product"]),
    targetId: z.number(),
    kind: z.enum(["like", "save"]),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const existing = await db.select().from(reactions).where(and(
      eq(reactions.userId, ctx.user.id), eq(reactions.targetType, input.targetType),
      eq(reactions.targetId, input.targetId), eq(reactions.kind, input.kind),
    )).limit(1);
    if (existing.length > 0) {
      await db.delete(reactions).where(eq(reactions.id, existing[0].id));
      return { active: false };
    }
    await db.insert(reactions).values({ userId: ctx.user.id, targetType: input.targetType, targetId: input.targetId, kind: input.kind });
    return { active: true };
  }),

  /** Freelancer applies to a job (questions / attachment / interview flows) */
  applyToJob: authedQuery.input(z.object({
    jobId: z.number(),
    answers: z.record(z.string(), z.string()).default({}),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const profile = await getProfile(ctx.user.id);
    const [job] = await db.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
    const dup = await db.select().from(applications).where(and(eq(applications.jobId, input.jobId), eq(applications.userId, ctx.user.id))).limit(1);
    if (dup.length > 0) throw new TRPCError({ code: "CONFLICT", message: "You already applied to this job" });
    await db.insert(applications).values({ jobId: input.jobId, userId: ctx.user.id, answers: input.answers });
    await awardXp(ctx.user.id, XP_REWARDS.applyJob, `Applied to ${job.title}`);
    const [startup] = await db.select().from(startups).where(eq(startups.id, job.startupId)).limit(1);
    await db.insert(notificationsTable).values({
      userId: ctx.user.id, kind: "application",
      title: `Application sent to ${startup?.name ?? "startup"}`,
      body: `Your application for "${job.title}" is in. ${startup?.name ?? "The startup"} will review it — you'll be notified at every status change.`,
    });
    return { ok: true, xp: profile.xp + XP_REWARDS.applyJob };
  }),

  myApplications: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select({ application: applications, job: jobs, startupName: startups.name, startupEmoji: startups.emoji })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(startups, eq(jobs.startupId, startups.id))
      .where(eq(applications.userId, ctx.user.id))
      .orderBy(desc(applications.createdAt));
  }),

  /** Investor invests in a startup */
  invest: authedQuery.input(z.object({ startupId: z.number(), amount: z.number().int().min(10).max(1000000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const profile = await getProfile(ctx.user.id);
      const [startup] = await db.select().from(startups).where(eq(startups.id, input.startupId)).limit(1);
      if (!startup) throw new TRPCError({ code: "NOT_FOUND", message: "Startup not found" });
      if (!startup.openForInvestment) throw new TRPCError({ code: "FORBIDDEN", message: "This startup is not open for investment" });

      // Balance check: completed in − completed out − in-flight out
      const txns = await db.select().from(walletTransactions).where(eq(walletTransactions.userId, ctx.user.id));
      const balance = txns.reduce((acc, t) => {
        if (t.status === "failed") return acc;
        if (t.direction === "in") return t.status === "completed" ? acc + t.amount : acc;
        return t.status === "completed" || t.status === "processing" ? acc - t.amount : acc;
      }, 0);
      if (input.amount > balance) throw new TRPCError({ code: "BAD_REQUEST", message: `Insufficient balance (available: $${balance}). Top up your wallet first.` });

      await db.insert(investments).values({ userId: ctx.user.id, startupId: input.startupId, amount: input.amount });
      await db.update(startups).set({ totalRaised: sql`totalRaised + ${input.amount}` }).where(eq(startups.id, input.startupId));
      await db.insert(walletTransactions).values({
        userId: ctx.user.id, direction: "out", amount: input.amount, fee: 0,
        counterparty: startup.name, category: "investment", status: "completed",
        note: `Investment in ${startup.name}`,
      });
      const firstInvestment = (await db.select().from(investments).where(eq(investments.userId, ctx.user.id))).length === 1;
      await awardXp(ctx.user.id, firstInvestment ? XP_REWARDS.invest * 2 : XP_REWARDS.invest, `Invested $${input.amount} in ${startup.name}`);
      await db.insert(notificationsTable).values({
        userId: ctx.user.id, kind: "report",
        title: `Herbie Jr. will now track ${startup.name} for you`,
        body: "You'll receive an AI investor report whenever this company posts results. Find them under Analytics → My Investments.",
      });
      return { ok: true, newBalance: balance - input.amount, rank: rankForXp(profile.xp) };
    }),

  /** Customer buys products (cart checkout) */
  checkout: authedQuery.input(z.object({
    items: z.array(z.object({ productId: z.number(), qty: z.number().int().min(1).max(10) })).min(1),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await getProfile(ctx.user.id);
    const items: { productId: number; name: string; qty: number; price: number }[] = [];
    let total = 0;
    for (const item of input.items) {
      const [p] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!p) throw new TRPCError({ code: "NOT_FOUND", message: `Product ${item.productId} not found` });
      items.push({ productId: p.id, name: p.name, qty: item.qty, price: p.price });
      total += p.price * item.qty;
    }
    await db.insert(orders).values({ userId: ctx.user.id, items, total, status: "processing" });
    await db.insert(walletTransactions).values({
      userId: ctx.user.id, direction: "out", amount: total, fee: 0,
      counterparty: items.length === 1 ? items[0].name : `${items.length} marketplace items`,
      category: "purchase", status: "completed", note: "Marketplace purchase",
    });
    for (const it of items) {
      await db.update(products).set({ sales: sql`sales + ${it.qty}` }).where(eq(products.id, it.productId));
    }
    await awardXp(ctx.user.id, XP_REWARDS.buyProduct, "Marketplace purchase");
    await db.insert(notificationsTable).values({
      userId: ctx.user.id, kind: "order", title: "Order confirmed 📦",
      body: `${items.length === 1 ? items[0].name : `${items.length} items`} — $${total}. We'll notify you when it ships.`,
    });
    return { ok: true, total };
  }),

  myOrders: authedQuery.query(async ({ ctx }) => {
    return getDb().select().from(orders).where(eq(orders.userId, ctx.user.id)).orderBy(desc(orders.createdAt));
  }),

  /** Customer posts a quick-hire request and optionally hires a freelancer */
  quickHire: authedQuery.input(z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(2000).default(""),
    budget: z.number().int().min(5).max(100000),
    tags: z.array(z.string()).max(10).default([]),
    freelancerId: z.number().optional(),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await getProfile(ctx.user.id);
    let freelancerName: string | null = null;
    if (input.freelancerId) {
      const [f] = await db.select().from(freelancers).where(eq(freelancers.id, input.freelancerId)).limit(1);
      if (!f) throw new TRPCError({ code: "NOT_FOUND", message: "Freelancer not found" });
      freelancerName = f.name;
    }
    await db.insert(quickJobs).values({
      userId: ctx.user.id, title: input.title, description: input.description,
      budget: input.budget, tags: input.tags,
      status: freelancerName ? "hired" : "open",
      hiredFreelancerId: input.freelancerId ?? null,
    });
    if (freelancerName) {
      await db.insert(walletTransactions).values({
        userId: ctx.user.id, direction: "out", amount: input.budget, fee: 0,
        counterparty: freelancerName, category: "quickhire", status: "processing",
        note: `Quick job escrow: ${input.title}`,
      });
      await db.insert(notificationsTable).values({
        userId: ctx.user.id, kind: "application", title: `${freelancerName} hired 🎉`,
        body: `$${input.budget} is held in escrow and releases when you confirm the work is done.`,
      });
    }
    await awardXp(ctx.user.id, XP_REWARDS.hireFreelancer, freelancerName ? `Hired ${freelancerName}` : "Posted a quick job");
    return { ok: true };
  }),

  myQuickJobs: authedQuery.query(async ({ ctx }) => {
    return getDb().select().from(quickJobs).where(eq(quickJobs.userId, ctx.user.id)).orderBy(desc(quickJobs.createdAt));
  }),

  /** Startup owner posts a job */
  postJob: authedQuery.input(z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(4000).default(""),
    tags: z.array(z.string()).max(10).default([]),
    payMin: z.number().int().min(0), payMax: z.number().int().min(0),
    payType: z.enum(["hourly", "fixed"]).default("hourly"),
    location: z.string().max(120).default("Remote"),
    requirementType: z.enum(["questions", "attachment", "interview"]).default("questions"),
    questions: z.array(z.string()).max(10).default([]),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await getProfile(ctx.user.id);
    const [mine] = await db.select().from(startups).where(eq(startups.ownerId, ctx.user.id)).limit(1);
    if (!mine) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create your startup profile first" });
    await db.insert(jobs).values({ ...input, startupId: mine.id });
    return { ok: true };
  }),

  /** Startup owner posts a product */
  postProduct: authedQuery.input(z.object({
    name: z.string().min(3).max(200),
    description: z.string().max(4000).default(""),
    price: z.number().int().min(1).max(1000000),
    category: z.string().max(60).default("Software"),
    tags: z.array(z.string()).max(10).default([]),
    emoji: z.string().max(8).default("📦"),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await getProfile(ctx.user.id);
    const [mine] = await db.select().from(startups).where(eq(startups.ownerId, ctx.user.id)).limit(1);
    if (!mine) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Create your startup profile first" });
    await db.insert(products).values({ ...input, startupId: mine.id });
    return { ok: true };
  }),

  /** Startup view: applicants to my jobs */
  myApplicants: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [mine] = await db.select().from(startups).where(eq(startups.ownerId, ctx.user.id)).limit(1);
    if (!mine) return { startup: null, rows: [] };
    const rows = await db
      .select({ application: applications, job: jobs, applicantName: profiles.displayName, applicantHeadline: profiles.headline })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(profiles, eq(applications.userId, profiles.userId))
      .where(eq(jobs.startupId, mine.id))
      .orderBy(desc(applications.createdAt));
    return { startup: mine, rows };
  }),

  updateApplicationStatus: authedQuery.input(z.object({
    applicationId: z.number(),
    status: z.enum(["viewed", "interview", "rejected", "hired"]),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [mine] = await db.select().from(startups).where(eq(startups.ownerId, ctx.user.id)).limit(1);
    if (!mine) throw new TRPCError({ code: "FORBIDDEN", message: "Only startup owners can do this" });
    const [app] = await db.select({ application: applications, job: jobs }).from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(eq(applications.id, input.applicationId), eq(jobs.startupId, mine.id))).limit(1);
    if (!app) throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
    await db.update(applications).set({ status: input.status }).where(eq(applications.id, input.applicationId));
    await db.insert(notificationsTable).values({
      userId: app.application.userId, kind: "application",
      title: `Application update: ${input.status}`,
      body: `${mine.name} moved your application for "${app.job?.title}" to ${input.status}.`,
    });
    return { ok: true };
  }),

  /** Start (or get) a p2p conversation with a startup or freelancer, with an opening message */
  messageTarget: authedQuery.input(z.object({
    targetType: z.enum(["startup", "freelancer"]),
    targetId: z.number(),
    text: z.string().min(1).max(2000),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    let title = "Conversation";
    if (input.targetType === "startup") {
      const [s] = await db.select().from(startups).where(eq(startups.id, input.targetId)).limit(1);
      if (s) title = s.name;
    } else {
      const [f] = await db.select().from(freelancers).where(eq(freelancers.id, input.targetId)).limit(1);
      if (f) title = f.name;
    }
    const existing = await db.select().from(conversations)
      .where(and(eq(conversations.userId, ctx.user.id), eq(conversations.title, title), eq(conversations.kind, "p2p"))).limit(1);
    let convId: number;
    if (existing.length > 0) convId = existing[0].id;
    else {
      const [c] = await db.insert(conversations).values({ userId: ctx.user.id, kind: "p2p", title, subtitle: input.targetType }).$returningId();
      convId = c.id;
    }
    await db.insert(messages).values({ conversationId: convId, sender: "user", text: input.text });
    // simulated reply from the counterparty
    const reply = CANNED_REPLIES[(convId + input.text.length) % CANNED_REPLIES.length];
    await db.insert(messages).values({ conversationId: convId, sender: "other", text: reply });
    return { conversationId: convId };
  }),
});
