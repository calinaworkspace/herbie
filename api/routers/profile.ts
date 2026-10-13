import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import {
  profiles, startups, freelancers, walletTransactions, notificationsTable,
  conversations, messages,
} from "../../db/schema";
import { rankForXp } from "@contracts/herbie";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function getProfile(userId: number) {
  const db = getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

async function requireProfile(userId: number) {
  const p = await getProfile(userId);
  if (!p) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete onboarding first" });
  return p;
}

async function awardXp(userId: number, amount: number, reason: string) {
  const db = getDb();
  await db.update(profiles).set({ xp: sql`xp + ${amount}` }).where(eq(profiles.userId, userId));
  await db.insert(notificationsTable).values({
    userId, kind: "system", title: `+${amount} XP — ${reason}`,
    body: "Keep going! XP unlocks higher Herbie ranks, lower fees, and more visibility.",
  });
}

async function notify(userId: number, kind: string, title: string, body?: string) {
  await getDb().insert(notificationsTable).values({ userId, kind, title, body });
}

const AVATAR_COLORS = ["#0FDEBD", "#16C98D", "#288AD6", "#1D508D", "#8b5cf6", "#f59e0b", "#ef4444", "#ec4899"];

function seedStarterWallet(userId: number, role: string) {
  const db = getDb();
  const now = Date.now();
  const d = (daysAgo: number) => new Date(now - daysAgo * 86400000);
  const rows: (typeof walletTransactions.$inferInsert)[] = [];
  if (role === "freelancer") {
    rows.push(
      { userId, direction: "in", amount: 480, fee: 10, counterparty: "PixelQuest Studios", category: "job", status: "completed", note: "Icon set delivery — Herbie fee (2%) included", createdAt: d(62) },
      { userId, direction: "in", amount: 320, fee: 6, counterparty: "LearnByte", category: "job", status: "completed", note: "Lesson graphics batch — Herbie fee (2%) included", createdAt: d(45) },
      { userId, direction: "out", amount: 59, fee: 0, counterparty: "LearnByte", category: "purchase", status: "completed", note: "Course: Advanced Figma", createdAt: d(40) },
      { userId, direction: "in", amount: 610, fee: 12, counterparty: "OrbitalCMS", category: "job", status: "completed", note: "Docs sprint — Herbie fee (2%) included", createdAt: d(21) },
      { userId, direction: "out", amount: 200, fee: 0, counterparty: "Withdrawal — Bank", category: "withdraw", status: "completed", createdAt: d(18) },
      { userId, direction: "in", amount: 275, fee: 6, counterparty: "Threadline", category: "job", status: "processing", note: "Lookbook illustrations — arriving soon", createdAt: d(2) },
      { userId, direction: "in", amount: 190, fee: 4, counterparty: "NomadEats", category: "job", status: "pending", note: "Menu photography — expected in 3 days", createdAt: d(0) },
    );
  } else if (role === "investor") {
    rows.push(
      { userId, direction: "out", amount: 5000, fee: 0, counterparty: "GreenLoop", category: "investment", status: "completed", note: "Seed participation", createdAt: d(70) },
      { userId, direction: "out", amount: 2500, fee: 0, counterparty: "Finlytic", category: "investment", status: "completed", note: "Seed participation", createdAt: d(41) },
      { userId, direction: "in", amount: 10000, fee: 0, counterparty: "Top-up — Visa", category: "topup", status: "completed", createdAt: d(75) },
      { userId, direction: "in", amount: 420, fee: 0, counterparty: "GreenLoop", category: "dividend", status: "completed", note: "Q2 profit distribution", createdAt: d(30) },
      { userId, direction: "in", amount: 185, fee: 0, counterparty: "PixelQuest Studios", category: "dividend", status: "pending", note: "Q3 distribution — expected in 5 days", createdAt: d(1) },
    );
  } else if (role === "startup") {
    rows.push(
      { userId, direction: "in", amount: 1240, fee: 25, counterparty: "Marketplace sales", category: "sales", status: "completed", note: "Week 36 product sales — Herbie fee (2%) included", createdAt: d(50) },
      { userId, direction: "in", amount: 5000, fee: 0, counterparty: "Angel investor", category: "investment", status: "completed", note: "Pre-seed ticket", createdAt: d(44) },
      { userId, direction: "out", amount: 480, fee: 0, counterparty: "Ayu Lestari", category: "payroll", status: "completed", note: "Freelancer: art pack", createdAt: d(38) },
      { userId, direction: "in", amount: 980, fee: 20, counterparty: "Marketplace sales", category: "sales", status: "completed", note: "Week 39 sales — Herbie fee (2%) included", createdAt: d(15) },
      { userId, direction: "out", amount: 320, fee: 0, counterparty: "Marco Reyes", category: "payroll", status: "processing", note: "Freelancer: dashboard fixes", createdAt: d(1) },
      { userId, direction: "in", amount: 720, fee: 14, counterparty: "Marketplace sales", category: "sales", status: "pending", note: "Week 41 sales — settling", createdAt: d(0) },
    );
  } else {
    rows.push(
      { userId, direction: "in", amount: 800, fee: 0, counterparty: "Top-up — Bank", category: "topup", status: "completed", createdAt: d(60) },
      { userId, direction: "out", amount: 42, fee: 0, counterparty: "GreenLoop", category: "purchase", status: "completed", note: "Starter Kit", createdAt: d(52) },
      { userId, direction: "out", amount: 18, fee: 0, counterparty: "PixelQuest Studios", category: "purchase", status: "completed", note: "Mosslight (Steam Key)", createdAt: d(33) },
      { userId, direction: "out", amount: 120, fee: 0, counterparty: "Maya Santoso", category: "quickhire", status: "completed", note: "Quick job: spreadsheet cleanup", createdAt: d(20) },
      { userId, direction: "in", amount: 400, fee: 0, counterparty: "Top-up — E-wallet", category: "topup", status: "completed", createdAt: d(12) },
      { userId, direction: "out", amount: 59, fee: 0, counterparty: "LearnByte", category: "purchase", status: "processing", note: "All-Access Yearly — payment processing", createdAt: d(0) },
    );
  }
  return db.insert(walletTransactions).values(rows);
}

// ---------------------------------------------------------------------------
// profile router
// ---------------------------------------------------------------------------

const onboardInput = z.object({
  displayName: z.string().min(1).max(120),
  pronouns: z.string().max(40),
  role: z.enum(["investor", "freelancer", "startup", "customer"]),
  tags: z.array(z.string()).max(30).default([]),
  bio: z.string().max(2000).optional(),
  headline: z.string().max(200).optional(),
  roleData: z.record(z.string(), z.unknown()).default({}),
});

export const profileRouter = createRouter({
  me: authedQuery.query(async ({ ctx }) => {
    const profile = await getProfile(ctx.user.id);
    if (!profile) return { profile: null, rank: null };
    return { profile, rank: rankForXp(profile.xp) };
  }),

  onboard: authedQuery.input(onboardInput).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const existing = await getProfile(ctx.user.id);
    const avatarColor = AVATAR_COLORS[ctx.user.id % AVATAR_COLORS.length];

    if (existing) {
      await db.update(profiles).set({
        displayName: input.displayName, pronouns: input.pronouns, herbieRole: input.role,
        tags: input.tags, bio: input.bio ?? null, headline: input.headline ?? null,
        roleData: input.roleData, onboarded: true,
      }).where(eq(profiles.userId, ctx.user.id));
    } else {
      await db.insert(profiles).values({
        userId: ctx.user.id, displayName: input.displayName, pronouns: input.pronouns,
        herbieRole: input.role, tags: input.tags, bio: input.bio ?? null,
        headline: input.headline ?? null, roleData: input.roleData, avatarColor, onboarded: true,
      });
      await seedStarterWallet(ctx.user.id, input.role);
      // Pin Herbie Jr. conversation
      const [conv] = await db.insert(conversations).values({ userId: ctx.user.id, kind: "jr", title: "Herbie Jr.", subtitle: "Your AI companion" }).$returningId();
      await db.insert(messages).values({
        conversationId: conv.id, sender: "jr",
        text: `Hi ${input.displayName}! I'm Herbie Jr. 🤖 Welcome to Herbie — you're starting as a Novice 🌱. I can track your wallet, explain ranks, recommend matches, and generate investor reports. What would you like to do first?`,
      });
      await notify(ctx.user.id, "news", "Welcome to Herbie! 🎉", "Your profile is live. Complete your profile sections to earn XP and unlock the Beginner rank.");
    }

    // Role-specific catalog rows
    if (input.role === "startup" && input.roleData.startupName) {
      const mine = await db.select().from(startups).where(eq(startups.ownerId, ctx.user.id)).limit(1);
      if (mine.length === 0) {
        await db.insert(startups).values({
          ownerId: ctx.user.id,
          name: String(input.roleData.startupName).slice(0, 160),
          pitch: String(input.roleData.pitch ?? "A new startup on Herbie").slice(0, 300),
          description: input.bio ?? null,
          industryTags: input.tags,
          foundingYear: Number(input.roleData.foundingYear ?? new Date().getFullYear()),
          teamSize: String(input.roleData.teamSize ?? "1-10"),
          location: String(input.roleData.location ?? "Remote"),
          fundingStage: String(input.roleData.fundingStage ?? "Bootstrapped"),
          openForFreelancers: Boolean(input.roleData.openForFreelancers ?? true),
          openForInvestment: Boolean(input.roleData.openForInvestment ?? false),
          emoji: "🚀",
        });
      }
    }
    if (input.role === "freelancer") {
      const mine = await db.select().from(freelancers).where(eq(freelancers.ownerId, ctx.user.id)).limit(1);
      if (mine.length === 0) {
        await db.insert(freelancers).values({
          ownerId: ctx.user.id, name: input.displayName,
          headline: input.headline ?? "Freelancer on Herbie", bio: input.bio ?? null,
          hourlyRate: Number(input.roleData.hourlyRate ?? 25),
          availability: String(input.roleData.availability ?? "Flexible"),
          tags: input.tags, skills: (input.roleData.skills as string[]) ?? [],
          languages: (input.roleData.languages as string[]) ?? ["English"],
          avatarColor,
        });
      }
    }

    await awardXp(ctx.user.id, 50, "Profile created");
    const profile = await requireProfile(ctx.user.id);
    return { profile, rank: rankForXp(profile.xp) };
  }),

  update: authedQuery.input(onboardInput.partial()).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await requireProfile(ctx.user.id);
    await db.update(profiles).set({
      ...(input.displayName !== undefined ? { displayName: input.displayName } : {}),
      ...(input.pronouns !== undefined ? { pronouns: input.pronouns } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
      ...(input.headline !== undefined ? { headline: input.headline } : {}),
      ...(input.roleData !== undefined ? { roleData: input.roleData } : {}),
    }).where(eq(profiles.userId, ctx.user.id));
    // keep freelancer catalog row in sync
    if (input.headline || input.bio || input.tags) {
      await db.update(freelancers).set({
        ...(input.headline ? { headline: input.headline } : {}),
        ...(input.bio ? { bio: input.bio } : {}),
        ...(input.tags ? { tags: input.tags } : {}),
      }).where(eq(freelancers.ownerId, ctx.user.id));
    }
    return { ok: true };
  }),
});
