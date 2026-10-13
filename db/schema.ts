import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  boolean,
  json,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// HERBIE TABLES
// ---------------------------------------------------------------------------

/** One Herbie profile per user — role + gamification + role-specific data */
export const profiles = mysqlTable("profiles", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull().unique(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  pronouns: varchar("pronouns", { length: 40 }).default("they/them").notNull(),
  herbieRole: mysqlEnum("herbieRole", ["investor", "freelancer", "startup", "customer"]).notNull(),
  xp: int("xp").default(0).notNull(),
  bio: text("bio"),
  headline: varchar("headline", { length: 200 }),
  avatarColor: varchar("avatarColor", { length: 20 }).default("#0FDEBD").notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  /** Role-specific fields (investor range, freelancer rate, startup info, customer interests) */
  roleData: json("roleData").$type<Record<string, unknown>>().notNull(),
  onboarded: boolean("onboarded").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Profile = typeof profiles.$inferSelect;

/** Startup / company catalog. ownerId null = seeded showcase startup */
export const startups = mysqlTable("startups", {
  id: serial("id").primaryKey(),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 160 }).notNull(),
  pitch: varchar("pitch", { length: 300 }).notNull(),
  description: text("description"),
  industryTags: json("industryTags").$type<string[]>().notNull(),
  foundingYear: int("foundingYear"),
  teamSize: varchar("teamSize", { length: 40 }),
  location: varchar("location", { length: 120 }),
  fundingStage: varchar("fundingStage", { length: 40 }).default("Bootstrapped").notNull(),
  openForFreelancers: boolean("openForFreelancers").default(true).notNull(),
  openForInvestment: boolean("openForInvestment").default(false).notNull(),
  annualRevenue: int("annualRevenue").default(0).notNull(),
  annualProfit: int("annualProfit").default(0).notNull(),
  totalRaised: int("totalRaised").default(0).notNull(),
  emoji: varchar("emoji", { length: 8 }).default("🚀").notNull(),
  gradient: varchar("gradient", { length: 60 }).default("from-teal-400 to-green-500").notNull(),
  rankTier: varchar("rankTier", { length: 20 }).default("Novice").notNull(),
  verified: boolean("verified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Startup = typeof startups.$inferSelect;

/** Freelancer catalog. ownerId null = seeded showcase freelancer */
export const freelancers = mysqlTable("freelancers", {
  id: serial("id").primaryKey(),
  ownerId: bigint("ownerId", { mode: "number", unsigned: true }),
  name: varchar("name", { length: 120 }).notNull(),
  headline: varchar("headline", { length: 200 }),
  bio: text("bio"),
  hourlyRate: int("hourlyRate").default(25).notNull(),
  availability: varchar("availability", { length: 40 }).default("Flexible").notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  skills: json("skills").$type<string[]>().notNull(),
  location: varchar("location", { length: 120 }),
  languages: json("languages").$type<string[]>().notNull(),
  rankTier: varchar("rankTier", { length: 20 }).default("Novice").notNull(),
  xp: int("xp").default(0).notNull(),
  rating: int("rating").default(45).notNull(), // x10, e.g. 45 = 4.5
  jobsCompleted: int("jobsCompleted").default(0).notNull(),
  avatarColor: varchar("avatarColor", { length: 20 }).default("#288AD6").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Freelancer = typeof freelancers.$inferSelect;

export const jobs = mysqlTable("jobs", {
  id: serial("id").primaryKey(),
  startupId: bigint("startupId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  tags: json("tags").$type<string[]>().notNull(),
  payMin: int("payMin").default(0).notNull(),
  payMax: int("payMax").default(0).notNull(),
  payType: varchar("payType", { length: 20 }).default("hourly").notNull(), // hourly | fixed
  location: varchar("location", { length: 120 }).default("Remote").notNull(),
  requirementType: mysqlEnum("requirementType", ["questions", "attachment", "interview"]).default("questions").notNull(),
  questions: json("questions").$type<string[]>().notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  startupId: bigint("startupId", { mode: "number", unsigned: true }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  price: int("price").default(0).notNull(), // dollars
  category: varchar("category", { length: 60 }).default("Software").notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  rating: int("rating").default(45).notNull(), // x10
  reviewCount: int("reviewCount").default(0).notNull(),
  sales: int("sales").default(0).notNull(),
  emoji: varchar("emoji", { length: 8 }).default("📦").notNull(),
  gradient: varchar("gradient", { length: 60 }).default("from-teal-400 to-green-500").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;

export const applications = mysqlTable("applications", {
  id: serial("id").primaryKey(),
  jobId: bigint("jobId", { mode: "number", unsigned: true }).notNull(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["pending", "viewed", "interview", "rejected", "hired"]).default("pending").notNull(),
  answers: json("answers").$type<Record<string, string>>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Application = typeof applications.$inferSelect;

export const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  items: json("items").$type<{ productId: number; name: string; qty: number; price: number }[]>().notNull(),
  total: int("total").default(0).notNull(),
  status: mysqlEnum("status", ["processing", "shipped", "delivered"]).default("processing").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;

export const investments = mysqlTable("investments", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  startupId: bigint("startupId", { mode: "number", unsigned: true }).notNull(),
  amount: int("amount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Investment = typeof investments.$inferSelect;

export const walletTransactions = mysqlTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  direction: mysqlEnum("direction", ["in", "out"]).notNull(),
  amount: int("amount").notNull(),
  fee: int("fee").default(0).notNull(),
  counterparty: varchar("counterparty", { length: 160 }).notNull(),
  category: varchar("category", { length: 60 }).default("general").notNull(),
  status: mysqlEnum("status", ["completed", "pending", "processing", "failed"]).default("completed").notNull(),
  note: varchar("note", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WalletTransaction = typeof walletTransactions.$inferSelect;

export const paymentMethods = mysqlTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  kind: mysqlEnum("kind", ["bank", "card", "ewallet"]).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  detail: varchar("detail", { length: 120 }).notNull(),
  isPrimary: boolean("isPrimary").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentMethod = typeof paymentMethods.$inferSelect;

export const notificationsTable = mysqlTable("notifications", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  kind: varchar("kind", { length: 40 }).default("news").notNull(), // news | invite | recommendation | application | report | order | system
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NotificationRow = typeof notificationsTable.$inferSelect;

export const conversations = mysqlTable("conversations", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  kind: mysqlEnum("kind", ["jr", "p2p"]).default("p2p").notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  subtitle: varchar("subtitle", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;

export const messages = mysqlTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: bigint("conversationId", { mode: "number", unsigned: true }).notNull(),
  sender: mysqlEnum("sender", ["user", "other", "jr"]).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;

export const reactions = mysqlTable(
  "reactions",
  {
    id: serial("id").primaryKey(),
    userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
    targetType: mysqlEnum("targetType", ["job", "startup", "freelancer", "product"]).notNull(),
    targetId: bigint("targetId", { mode: "number", unsigned: true }).notNull(),
    kind: mysqlEnum("kind", ["like", "save"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reaction_unique").on(t.userId, t.targetType, t.targetId, t.kind)],
);

export type Reaction = typeof reactions.$inferSelect;

/** Pre-generated Herbie Jr. investor reports per startup */
export const reports = mysqlTable("reports", {
  id: serial("id").primaryKey(),
  startupId: bigint("startupId", { mode: "number", unsigned: true }).notNull(),
  period: varchar("period", { length: 60 }).notNull(),
  payload: json("payload").$type<{
    revenue: number;
    profit: number;
    growthPct: number;
    spendBreakdown: { label: string; amount: number }[];
    monthly: { label: string; revenue: number; profit: number }[];
    riskNotes: string[];
    summary: string;
  }>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Report = typeof reports.$inferSelect;

/** Customer quick-hire requests */
export const quickJobs = mysqlTable("quick_jobs", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  budget: int("budget").default(0).notNull(),
  tags: json("tags").$type<string[]>().notNull(),
  status: varchar("status", { length: 20 }).default("open").notNull(),
  hiredFreelancerId: bigint("hiredFreelancerId", { mode: "number", unsigned: true }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type QuickJob = typeof quickJobs.$inferSelect;
