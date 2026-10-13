import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { notificationsTable, conversations, messages } from "../../db/schema";

export const socialRouter = createRouter({
  notifications: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, ctx.user.id))
      .orderBy(desc(notificationsTable.createdAt)).limit(60);
    const unread = rows.filter((r) => !r.read).length;
    return { rows, unread };
  }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    await getDb().update(notificationsTable).set({ read: true })
      .where(eq(notificationsTable.userId, ctx.user.id));
    return { ok: true };
  }),

  conversations: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const convs = await db.select().from(conversations)
      .where(eq(conversations.userId, ctx.user.id))
      .orderBy(desc(conversations.createdAt));
    const withLast = await Promise.all(convs.map(async (c) => {
      const [last] = await db.select().from(messages)
        .where(eq(messages.conversationId, c.id)).orderBy(desc(messages.createdAt)).limit(1);
      return { ...c, lastMessage: last ?? null };
    }));
    // Herbie Jr. pinned first
    return withLast.sort((a, b) => (a.kind === "jr" ? -1 : 0) - (b.kind === "jr" ? -1 : 0));
  }),

  messages: authedQuery.input(z.object({ conversationId: z.number() })).query(async ({ ctx, input }) => {
    const db = getDb();
    const [conv] = await db.select().from(conversations)
      .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))).limit(1);
    if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
    const rows = await db.select().from(messages)
      .where(eq(messages.conversationId, input.conversationId)).orderBy(messages.createdAt);
    return { conversation: conv, messages: rows };
  }),

  sendMessage: authedQuery.input(z.object({ conversationId: z.number(), text: z.string().min(1).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [conv] = await db.select().from(conversations)
        .where(and(eq(conversations.id, input.conversationId), eq(conversations.userId, ctx.user.id))).limit(1);
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      await db.insert(messages).values({ conversationId: input.conversationId, sender: "user", text: input.text });
      if (conv.kind === "p2p") {
        const replies = [
          "Got it, thanks! We'll get back to you shortly.",
          "Thanks for the message! Someone from the team will reply within a day.",
          "Noted! Let's continue here.",
        ];
        await db.insert(messages).values({
          conversationId: input.conversationId, sender: "other",
          text: replies[(input.text.length + input.conversationId) % replies.length],
        });
      }
      return { ok: true };
    }),

  unreadCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [row] = await db.select({ count: sql<number>`count(*)` }).from(notificationsTable)
      .where(and(eq(notificationsTable.userId, ctx.user.id), eq(notificationsTable.read, false)));
    return { count: Number(row?.count ?? 0) };
  }),
});
