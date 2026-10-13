import { RANK_LADDER } from "@contracts/herbie";

export function fmt$(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return fmt$(n);
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function rankIcon(tier: string): string {
  return RANK_LADDER.find((r) => r.tier === tier)?.icon ?? "🌱";
}

export const RANK_COLORS: Record<string, string> = {
  Novice: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Beginner: "bg-green-50 text-green-700 border-green-200",
  Apprentice: "bg-amber-50 text-amber-700 border-amber-200",
  Intermediate: "bg-orange-50 text-orange-700 border-orange-200",
  Advanced: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Expert: "bg-purple-50 text-purple-700 border-purple-200",
  Master: "bg-yellow-50 text-yellow-700 border-yellow-300",
};

export const TXN_STATUS_META: Record<string, { label: string; icon: string; classes: string }> = {
  completed: { label: "Received", icon: "✅", classes: "bg-herbiegreen-light text-herbiegreen-dark" },
  pending: { label: "Pending", icon: "⏳", classes: "bg-amber-50 text-amber-600" },
  processing: { label: "On its way", icon: "🚀", classes: "bg-blue-50 text-link" },
  failed: { label: "Failed", icon: "❌", classes: "bg-red-50 text-red-500" },
};

export const APP_STATUS_META: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pending", classes: "bg-amber-50 text-amber-600" },
  viewed: { label: "Viewed", classes: "bg-blue-50 text-link" },
  interview: { label: "Interview", classes: "bg-purple-50 text-purple-600" },
  rejected: { label: "Rejected", classes: "bg-red-50 text-red-500" },
  hired: { label: "Hired 🎉", classes: "bg-herbiegreen-light text-herbiegreen-dark" },
};

export const ORDER_STATUS_META: Record<string, { label: string; classes: string }> = {
  processing: { label: "Processing", classes: "bg-blue-50 text-link" },
  shipped: { label: "Shipped", classes: "bg-amber-50 text-amber-600" },
  delivered: { label: "Delivered", classes: "bg-herbiegreen-light text-herbiegreen-dark" },
};
