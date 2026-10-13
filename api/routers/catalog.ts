import { eq, desc, like, or, sql, and } from "drizzle-orm";
import { z } from "zod";
import { authedQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { startups, freelancers, jobs, products, reports, reactions, investments, profiles } from "../../db/schema";

function matchesTags(rowTags: string[], userTags: string[]): number {
  const set = new Set(userTags.map((t) => t.toLowerCase()));
  return rowTags.filter((t) => set.has(t.toLowerCase())).length;
}

export const catalogRouter = createRouter({
  startups: authedQuery.query(async () => {
    return getDb().select().from(startups).orderBy(desc(startups.verified), desc(startups.annualRevenue));
  }),

  startup: authedQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const db = getDb();
    const [startup] = await db.select().from(startups).where(eq(startups.id, input.id)).limit(1);
    if (!startup) return null;
    const startupJobs = await db.select().from(jobs).where(and(eq(jobs.startupId, input.id), eq(jobs.status, "open")));
    const startupProducts = await db.select().from(products).where(eq(products.startupId, input.id));
    const startupReports = await db.select().from(reports).where(eq(reports.startupId, input.id)).orderBy(desc(reports.createdAt));
    return { startup, jobs: startupJobs, products: startupProducts, reports: startupReports };
  }),

  freelancers: authedQuery.query(async () => {
    return getDb().select().from(freelancers).orderBy(desc(freelancers.xp));
  }),

  jobs: authedQuery.query(async () => {
    const db = getDb();
    const rows = await db
      .select({ job: jobs, startupName: startups.name, startupEmoji: startups.emoji, startupGradient: startups.gradient, startupVerified: startups.verified })
      .from(jobs).leftJoin(startups, eq(jobs.startupId, startups.id))
      .where(eq(jobs.status, "open"))
      .orderBy(desc(jobs.createdAt));
    return rows;
  }),

  products: authedQuery.query(async () => {
    const db = getDb();
    return db
      .select({ product: products, startupName: startups.name, startupVerified: startups.verified })
      .from(products).leftJoin(startups, eq(products.startupId, startups.id))
      .orderBy(desc(products.sales));
  }),

  /** Global search by keyword or #tag across everything */
  search: authedQuery.input(z.object({ q: z.string().max(120) })).query(async ({ input }) => {
    const db = getDb();
    const raw = input.q.trim();
    const term = raw.replace(/^#/, "");
    if (!term) return { jobs: [], startups: [], freelancers: [], products: [] };
    const p = `%${term}%`;
    const tagClause = sql`JSON_SEARCH(LOWER(COALESCE(${jobs.tags}, JSON_ARRAY())), 'one', LOWER(${term})) IS NOT NULL`;
    const [jobRows, startupRows, freelancerRows, productRows] = await Promise.all([
      db.select({ job: jobs, startupName: startups.name, startupEmoji: startups.emoji, startupGradient: startups.gradient, startupVerified: startups.verified })
        .from(jobs).leftJoin(startups, eq(jobs.startupId, startups.id))
        .where(or(like(jobs.title, p), like(jobs.description, p), tagClause)).limit(30),
      db.select().from(startups).where(or(like(startups.name, p), like(startups.pitch, p), like(startups.description, p),
        sql`JSON_SEARCH(LOWER(COALESCE(${startups.industryTags}, JSON_ARRAY())), 'one', LOWER(${term})) IS NOT NULL`)).limit(30),
      db.select().from(freelancers).where(or(like(freelancers.name, p), like(freelancers.headline, p), like(freelancers.bio, p),
        sql`JSON_SEARCH(LOWER(COALESCE(${freelancers.tags}, JSON_ARRAY())), 'one', LOWER(${term})) IS NOT NULL`)).limit(30),
      db.select({ product: products, startupName: startups.name, startupVerified: startups.verified })
        .from(products).leftJoin(startups, eq(products.startupId, startups.id))
        .where(or(like(products.name, p), like(products.description, p), like(products.category, p),
          sql`JSON_SEARCH(LOWER(COALESCE(${products.tags}, JSON_ARRAY())), 'one', LOWER(${term})) IS NOT NULL`)).limit(30),
    ]);
    return { jobs: jobRows, startups: startupRows, freelancers: freelancerRows, products: productRows };
  }),

  /** Role-personalized explore feed — best matches based on the user's tags */
  feed: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, ctx.user.id)).limit(1);
    const userTags: string[] = profile?.tags ?? [];

    const [jobRows, startupRows, freelancerRows, productRows] = await Promise.all([
      db.select({ job: jobs, startupName: startups.name, startupEmoji: startups.emoji, startupGradient: startups.gradient, startupVerified: startups.verified })
        .from(jobs).leftJoin(startups, eq(jobs.startupId, startups.id)).where(eq(jobs.status, "open")),
      db.select().from(startups),
      db.select().from(freelancers),
      db.select({ product: products, startupName: startups.name, startupVerified: startups.verified })
        .from(products).leftJoin(startups, eq(products.startupId, startups.id)),
    ]);

    const role = profile?.herbieRole ?? "customer";
    const scoreJobs = jobRows
      .map((r) => ({ ...r, score: matchesTags(r.job.tags, userTags) * 10 + (r.startupVerified ? 2 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 12);
    const scoreStartups = startupRows
      .map((s) => ({ ...s, score: matchesTags(s.industryTags, userTags) * 10 + (s.verified ? 3 : 0) + (role === "investor" && s.openForInvestment ? 5 : 0) }))
      .sort((a, b) => b.score - a.score).slice(0, 12);
    const scoreFreelancers = freelancerRows
      .map((f) => ({ ...f, score: matchesTags(f.tags, userTags) * 10 + f.rating / 10 }))
      .sort((a, b) => b.score - a.score).slice(0, 12);
    const scoreProducts = productRows
      .map((r) => ({ ...r, score: matchesTags(r.product.tags, userTags) * 10 + r.product.rating / 10 }))
      .sort((a, b) => b.score - a.score).slice(0, 12);

    return { role, jobs: scoreJobs, startups: scoreStartups, freelancers: scoreFreelancers, products: scoreProducts };
  }),

  /** The current user's like/save reactions, for card state */
  myReactions: authedQuery.query(async ({ ctx }) => {
    return getDb().select().from(reactions).where(eq(reactions.userId, ctx.user.id));
  }),

  /** Reports visible to an investor for startups they invested in */
  myReports: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const myInvestments = await db.select().from(investments).where(eq(investments.userId, ctx.user.id));
    if (myInvestments.length === 0) return [];
    const ids = myInvestments.map((i) => i.startupId);
    const rows = await db
      .select({ report: reports, startupName: startups.name, startupEmoji: startups.emoji, startupGradient: startups.gradient })
      .from(reports).leftJoin(startups, eq(reports.startupId, startups.id))
      .where(sql`${reports.startupId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
      .orderBy(desc(reports.createdAt));
    return rows;
  }),
});
