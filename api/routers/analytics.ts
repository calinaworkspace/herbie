import { eq, desc, sql } from "drizzle-orm";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import {
  profiles, startups, jobs, products, applications, orders,
  investments, walletTransactions, reports,
} from "../../db/schema";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface SeriesPoint { label: string; value: number }

/** Build a monthly series for the last `n` months ending now */
function monthSeries(n: number): { label: string; key: string }[] {
  const out: { label: string; key: string }[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push({ label: MONTHS[m.getMonth()], key: `${m.getFullYear()}-${m.getMonth()}` });
  }
  return out;
}

function keyOf(date: Date) { return `${date.getFullYear()}-${date.getMonth()}`; }

function sumByMonth(txns: { direction: string; amount: number; status: string; createdAt: Date }[], direction: string, n: number): SeriesPoint[] {
  const series = monthSeries(n);
  return series.map((s) => ({
    label: s.label,
    value: txns
      .filter((t) => t.direction === direction && t.status === "completed" && keyOf(t.createdAt) === s.key)
      .reduce((a, t) => a + t.amount, 0),
  }));
}

export const analyticsRouter = createRouter({
  overview: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.user.id)).limit(1);
    if (!profile) return null;
    const role = profile.herbieRole;

    const txns = await db.select().from(walletTransactions)
      .where(eq(walletTransactions.userId, ctx.user.id)).orderBy(desc(walletTransactions.createdAt)).limit(300);

    const incomeSeries = sumByMonth(txns, "in", 6);
    const outcomeSeries = sumByMonth(txns, "out", 6);

    const base = { role, incomeSeries, outcomeSeries, transactions: txns };

    if (role === "investor") {
      const myInvestments = await db
        .select({ investment: investments, startup: startups })
        .from(investments).leftJoin(startups, eq(investments.startupId, startups.id))
        .where(eq(investments.userId, ctx.user.id));
      const portfolio = myInvestments
        .filter((r) => r.startup)
        .map((r) => {
          const s = r.startup!;
          const margin = s.annualRevenue > 0 ? s.annualProfit / s.annualRevenue : 0;
          const multiplier = 1 + Math.min(Math.max(margin, -0.2), 0.6);
          return {
            startupId: s.id, name: s.name, emoji: s.emoji, gradient: s.gradient,
            invested: r.investment.amount,
            currentValue: Math.round(r.investment.amount * multiplier),
            pnl: Math.round(r.investment.amount * (multiplier - 1)),
            industry: s.industryTags[0] ?? "Other",
            date: r.investment.createdAt,
          };
        });
      const ids = myInvestments.map((i) => i.investment.startupId);
      let reportRows: { report: typeof reports.$inferSelect; startupName: string | null; startupEmoji: string | null; startupGradient: string | null }[] = [];
      if (ids.length > 0) {
        reportRows = await db
          .select({ report: reports, startupName: startups.name, startupEmoji: startups.emoji, startupGradient: startups.gradient })
          .from(reports).leftJoin(startups, eq(reports.startupId, startups.id))
          .where(sql`${reports.startupId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
          .orderBy(desc(reports.createdAt));
      }
      const totalInvested = portfolio.reduce((a, p) => a + p.invested, 0);
      const currentValue = portfolio.reduce((a, p) => a + p.currentValue, 0);
      const allocation: Record<string, number> = {};
      for (const p of portfolio) allocation[p.industry] = (allocation[p.industry] ?? 0) + p.invested;
      return {
        ...base, portfolio, reports: reportRows, totalInvested, currentValue,
        totalPnl: currentValue - totalInvested,
        allocation: Object.entries(allocation).map(([label, value]) => ({ label, value })),
      };
    }

    if (role === "startup") {
      const [mine] = await db.select().from(startups).where(eq(startups.ownerId, ctx.user.id)).limit(1);
      const myJobs = mine ? await db.select().from(jobs).where(eq(jobs.startupId, mine.id)) : [];
      const myProducts = mine ? await db.select().from(products).where(eq(products.startupId, mine.id)) : [];
      const applicantCounts = myJobs.length > 0
        ? await db.select({ jobId: applications.jobId, count: sql<number>`count(*)` })
            .from(applications)
            .where(sql`${applications.jobId} IN (${sql.join(myJobs.map((j) => sql`${j.id}`), sql`, `)})`)
            .groupBy(applications.jobId)
        : [];
      const salesSeries = sumByMonth(txns.filter((t) => t.category === "sales"), "in", 6);
      const hasSales = salesSeries.some((s) => s.value > 0);
      // For showcase: derive a synthetic revenue ramp from the startup's annual revenue
      const synth = monthSeries(6).map((s, i) => ({
        label: s.label,
        value: mine ? Math.round((mine.annualRevenue / 12) * (0.78 + i * 0.08)) : 0,
      }));
      return {
        ...base,
        startup: mine ?? null,
        revenueSeries: hasSales ? salesSeries : synth,
        productsBreakdown: myProducts.map((p) => ({ label: p.name, value: p.sales * p.price })),
        spendBreakdown: [
          { label: "Team & freelancers", value: Math.round((mine?.annualRevenue ?? 100000) * 0.42 / 12) },
          { label: "Operations", value: Math.round((mine?.annualRevenue ?? 100000) * 0.23 / 12) },
          { label: "Marketing", value: Math.round((mine?.annualRevenue ?? 100000) * 0.18 / 12) },
          { label: "Tools & infra", value: Math.round((mine?.annualRevenue ?? 100000) * 0.09 / 12) },
        ],
        jobsWithApplicants: myJobs.map((j) => ({ ...j, applicants: applicantCounts.find((a) => a.jobId === j.id)?.count ?? 0 })),
        totalRaised: mine?.totalRaised ?? 0,
        workerStats: {
          openJobs: myJobs.filter((j) => j.status === "open").length,
          totalApplicants: applicantCounts.reduce((a, c) => a + Number(c.count), 0),
          productsLive: myProducts.length,
        },
      };
    }

    if (role === "freelancer") {
      const jobIncome = txns.filter((t) => t.direction === "in" && t.category === "job" && t.status === "completed");
      const byClient: Record<string, number> = {};
      for (const t of jobIncome) byClient[t.counterparty] = (byClient[t.counterparty] ?? 0) + t.amount;
      const pending = txns.filter((t) => t.direction === "in" && (t.status === "pending" || t.status === "processing"));
      const totalEarned = jobIncome.reduce((a, t) => a + t.amount, 0);
      const apps = await db.select().from(applications).where(eq(applications.userId, ctx.user.id));
      return {
        ...base,
        earningsSeries: sumByMonth(txns.filter((t) => t.category === "job"), "in", 6),
        byClient: Object.entries(byClient).map(([label, value]) => ({ label, value })),
        pendingPayments: pending,
        totalEarned,
        applicationStats: {
          total: apps.length,
          pending: apps.filter((a) => a.status === "pending" || a.status === "viewed").length,
          interview: apps.filter((a) => a.status === "interview").length,
          hired: apps.filter((a) => a.status === "hired").length,
        },
      };
    }

    // customer
    const purchases = txns.filter((t) => t.direction === "out" && t.status !== "failed");
    const byCategory: Record<string, number> = {};
    for (const t of purchases) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
    const myOrders = await db.select().from(orders).where(eq(orders.userId, ctx.user.id)).orderBy(desc(orders.createdAt)).limit(20);
    const totalSpent = purchases.reduce((a, t) => a + t.amount, 0);
    const monthlyBudget = Number((profile.roleData as Record<string, unknown>)?.monthlyBudget ?? 500);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const spentThisMonth = purchases.filter((t) => t.createdAt >= monthStart).reduce((a, t) => a + t.amount, 0);
    return {
      ...base,
      spendingSeries: sumByMonth(txns, "out", 6),
      byCategory: Object.entries(byCategory).map(([label, value]) => ({ label, value })),
      orders: myOrders, totalSpent, monthlyBudget, spentThisMonth,
    };
  }),
});
