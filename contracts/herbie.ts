// Shared Herbie domain constants — used by both frontend and backend.

export type HerbieRole = "investor" | "freelancer" | "startup" | "customer";

export const HERBIE_ROLES: { id: HerbieRole; label: string; blurb: string; icon: string }[] = [
  { id: "investor", label: "Investor", blurb: "Back startups and track transparent AI reports on every dollar.", icon: "trending-up" },
  { id: "freelancer", label: "Freelancer", blurb: "Find work, apply to startup jobs, and grow your rank.", icon: "laptop" },
  { id: "startup", label: "Startup / Company", blurb: "Hire talent, raise investment, and sell products.", icon: "rocket" },
  { id: "customer", label: "Customer", blurb: "Shop startup products and hire freelancers for quick jobs.", icon: "shopping-bag" },
];

export interface RankDef {
  tier: string;
  icon: string;
  minXp: number;
  feePercent: number;
  perks: string[];
}

export const RANK_LADDER: RankDef[] = [
  { tier: "Novice", icon: "🌱", minXp: 0, feePercent: 2.0, perks: ["Basic profile", "Apply / buy / invest", "Standard visibility"] },
  { tier: "Beginner", icon: "🌿", minXp: 200, feePercent: 1.8, perks: ["Custom profile banner", "See who viewed your profile"] },
  { tier: "Apprentice", icon: "⚡", minXp: 600, feePercent: 1.5, perks: ["Priority in search results", "5 featured applications / month"] },
  { tier: "Intermediate", icon: "🔥", minXp: 1500, feePercent: 1.2, perks: ["Verified-style badge", "Advanced analytics", "10 featured applications / month"] },
  { tier: "Advanced", icon: "💎", minXp: 3500, feePercent: 1.0, perks: ["Homepage featuring eligibility", "Unlimited featured applications", "Early access to new features"] },
  { tier: "Expert", icon: "👑", minXp: 7500, feePercent: 0.7, perks: ["Top-talent badge", "Priority Herbie Jr. insights", "Highlighted profile glow"] },
  { tier: "Master", icon: "🏆", minXp: 15000, feePercent: 0.5, perks: ["Maximum platform promotion", "Herbie Council voting rights", "All features unlocked", "Legendary profile frame"] },
];

export function rankForXp(xp: number): RankDef {
  let current = RANK_LADDER[0];
  for (const r of RANK_LADDER) if (xp >= r.minXp) current = r;
  return current;
}

export function nextRank(xp: number): RankDef | null {
  for (const r of RANK_LADDER) if (xp < r.minXp) return r;
  return null;
}

export const XP_REWARDS: Record<string, number> = {
  completeProfile: 50,
  applyJob: 20,
  getHired: 150,
  completeJob: 100,
  fiveStarReview: 60,
  invest: 80,
  readReport: 10,
  diversify: 40,
  gainCustomer: 25,
  gainInvestor: 60,
  hireFreelancer: 40,
  salesMilestone: 100,
  buyProduct: 15,
  leaveReview: 20,
  fastReply: 5,
};

export const TAG_GROUPS: { group: string; tags: string[] }[] = [
  { group: "Tech & Development", tags: ["WebDevelopment", "MobileApps", "Frontend", "Backend", "FullStack", "AI", "MachineLearning", "DataScience", "Blockchain", "GameDev", "DevOps", "Cybersecurity", "QA", "WordPress", "Shopify", "API", "CloudComputing", "IoT", "AR", "VR"] },
  { group: "Design & Creative", tags: ["GraphicDesign", "LogoDesign", "UIDesign", "UXDesign", "Illustration", "3DModeling", "Animation", "MotionGraphics", "Branding", "ProductDesign", "VideoEditing", "Photography", "MusicProduction", "VoiceOver", "GameArt"] },
  { group: "Marketing & Sales", tags: ["DigitalMarketing", "SEO", "SocialMedia", "ContentMarketing", "EmailMarketing", "Ads", "GrowthHacking", "Copywriting", "MarketResearch", "Sales", "LeadGeneration", "InfluencerMarketing", "PR"] },
  { group: "Writing & Translation", tags: ["ContentWriting", "TechnicalWriting", "Translation", "Proofreading", "CreativeWriting", "Scriptwriting", "ResumeWriting", "Ghostwriting"] },
  { group: "Business & Admin", tags: ["VirtualAssistant", "DataEntry", "ProjectManagement", "Accounting", "Bookkeeping", "Legal", "HR", "CustomerSupport", "Consulting", "BusinessPlans", "Finance", "Excel", "Research"] },
  { group: "Industry (startups)", tags: ["FinTech", "HealthTech", "EdTech", "Ecommerce", "SaaS", "Gaming", "FoodTech", "GreenTech", "AIStartup", "Marketplace", "Media", "Fashion", "Travel", "RealEstate", "Logistics", "Web3", "Robotics", "Biotech"] },
  { group: "Product (marketplace)", tags: ["Games", "DigitalArt", "Software", "Courses", "Merch", "Templates", "Ebooks", "Music", "Plugins", "Subscriptions"] },
];

export const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

export const BRAND = {
  navy: "#1D508D",
  link: "#288AD6",
  teal: "#0FDEBD",
  green: "#16C98D",
  bg: "#F5F7FA",
} as const;

export const PRONOUN_OPTIONS = ["she/her", "he/him", "they/them", "custom"] as const;

export type TxnStatus = "completed" | "pending" | "processing" | "failed";
export type TxnDirection = "in" | "out";
export type ApplicationStatus = "pending" | "viewed" | "interview" | "rejected" | "hired";
export type OrderStatus = "processing" | "shipped" | "delivered";
export type RequirementType = "questions" | "attachment" | "interview";
