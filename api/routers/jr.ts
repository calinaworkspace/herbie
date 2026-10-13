import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { profiles, walletTransactions } from "../../db/schema";
import { listModels, classifyAiError, AiUnavailable, AiMisconfigured } from "../lib/ai-client";
import { rankForXp, nextRank } from "@contracts/herbie";

function cannedReply(profile: { displayName: string; xp: number; herbieRole: string } | null, txns: { direction: string; amount: number; status: string }[], question: string): string {
  const name = profile?.displayName ?? "there";
  const rank = rankForXp(profile?.xp ?? 0);
  const next = nextRank(profile?.xp ?? 0);
  const q = question.toLowerCase();
  const inSum = txns.filter((t) => t.direction === "in" && t.status === "completed").reduce((a, t) => a + t.amount, 0);
  const outSum = txns.filter((t) => t.direction === "out" && t.status === "completed").reduce((a, t) => a + t.amount, 0);
  if (q.includes("balance") || q.includes("wallet") || q.includes("money")) {
    return `Quick wallet check, ${name}: you've received $${inSum} and spent $${outSum} so far — available balance is $${inSum - outSum}. Pending and processing amounts show in the Wallet tab. 💲`;
  }
  if (q.includes("rank") || q.includes("xp") || q.includes("level")) {
    return `You're ${rank.icon} ${rank.tier} with ${profile?.xp ?? 0} XP.${next ? ` Reach ${next.minXp} XP to become ${next.icon} ${next.tier} and drop your fee to ${next.feePercent}%.` : " You've reached the top rank — legendary!"} Fastest XP: complete your profile, apply to jobs, and stay responsive in messages.`;
  }
  return `I'm running in offline mode right now, ${name}, but here's what I'd suggest: check Explore for matches tagged with your interests, keep your profile 100% complete for visibility, and ask me again in a bit for deeper analysis. 🌱`;
}

export const jrRouter = createRouter({
  chat: authedQuery.input(z.object({
    text: z.string().min(1).max(2000),
    history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(12).default([]),
  })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.user.id)).limit(1);
    const txns = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, ctx.user.id)).orderBy(desc(walletTransactions.createdAt)).limit(50);

    const rank = rankForXp(profile?.xp ?? 0);
    const inSum = txns.filter((t) => t.direction === "in" && t.status === "completed").reduce((a, t) => a + t.amount, 0);
    const outSum = txns.filter((t) => t.direction === "out" && t.status === "completed").reduce((a, t) => a + t.amount, 0);

    const system = `You are Herbie Jr., the friendly AI companion inside Herbie — a 4-sided marketplace connecting Investors, Freelancers, Startups and Customers. Be warm, concise (2-4 sentences), use light emoji, and always address the user by name.
Context about this user: name=${profile?.displayName ?? "unknown"}, role=${profile?.herbieRole ?? "unknown"}, rank=${rank.tier} (${profile?.xp ?? 0} XP), wallet: received $${inSum}, spent $${outSum}, tags=${(profile?.tags ?? []).join(", ") || "none"}.
Platform facts: 7 ranks (Novice→Master), fees drop from 2% to 0.5% as rank rises. XP comes from platform activity. Herbie Wallet tracks payments with statuses Completed/Pending/Processing/Failed. Investors get AI transparency reports on startups they back.`;

    try {
      const { defaultModelId } = await listModels();
      const provider = createOpenAICompatible({
        name: "kimi-gw",
        baseURL: process.env.KIMI_AGENTGW_BASE_URL!,
        apiKey: process.env.KIMI_AGENTGW_API_KEY!,
      });
      const result = await generateText({
        model: provider(defaultModelId),
        system,
        messages: [...input.history.map((m) => ({ role: m.role, content: m.content })), { role: "user" as const, content: input.text }],
      });
      const reply = result.text.trim() || cannedReply(profile, txns, input.text);
      return { reply, degraded: false };
    } catch (err) {
      const classified = classifyAiError(err);
      if (classified instanceof AiUnavailable || classified instanceof AiMisconfigured) {
        return { reply: cannedReply(profile, txns, input.text) + "\n\n⚠️ AI quota is temporarily limited, so I'm answering from my built-in knowledge.", degraded: true };
      }
      return { reply: cannedReply(profile, txns, input.text), degraded: true };
    }
  }),
});
