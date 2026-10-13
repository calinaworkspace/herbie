import { useState } from "react";
import { NavLink, Outlet, useNavigate, Navigate, useOutletContext } from "react-router";
import {
  LayoutDashboard, Compass, Search, Store, Briefcase, Users, MessageSquare,
  BarChart3, Trophy, Bell, Settings, LogOut, Menu, X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Logo } from "@/components/Logo";
import { HerbieJrFloating } from "@/components/HerbieJr";
import { fmt$, timeAgo } from "@/lib/herbie";
import { rankForXp, nextRank, type RankDef } from "@contracts/herbie";
import type { Profile } from "@contracts/types";

export interface ShellCtx { profile: Profile | null; rank: RankDef; next: RankDef | null; xpPct: number }
export function useShell() { return useOutletContext<ShellCtx>(); }

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/search", label: "Search", icon: Search },
  { to: "/marketplace", label: "Marketplace", icon: Store },
  { to: "/jobs", label: "Jobs & Gigs", icon: Briefcase },
  { to: "/talent", label: "Talent", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/ranks", label: "Ranks", icon: Trophy },
];

function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const notifs = trpc.social.notifications.useQuery();
  const markAll = trpc.social.markAllRead.useMutation({ onSuccess: () => utils.social.notifications.invalidate() });
  const KIND_ICON: Record<string, string> = { news: "📰", invite: "💌", recommendation: "✨", application: "📨", report: "🤖", order: "📦", system: "⭐" };
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-navy/30 backdrop-blur-sm" />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-navy">Notifications {notifs.data && notifs.data.unread > 0 && <span className="ml-1 text-xs bg-red-100 text-red-500 rounded-full px-2 py-0.5">{notifs.data.unread} new</span>}</div>
          <div className="flex gap-2">
            <button type="button" onClick={() => markAll.mutate()} className="text-xs font-semibold text-link hover:underline">Mark all read</button>
            <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {notifs.isLoading && <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>}
          {notifs.data?.rows.length === 0 && (
            <div className="p-10 text-center">
              <div className="text-4xl mb-3">🔔</div>
              <div className="font-semibold text-navy">All caught up!</div>
              <div className="text-sm text-slate-400 mt-1">New invites, reports and platform news will show up here.</div>
            </div>
          )}
          {notifs.data?.rows.map((n) => (
            <div key={n.id} className={`px-5 py-4 flex gap-3 ${n.read ? "opacity-60" : "bg-teal-light/40"}`}>
              <div className="text-xl shrink-0">{KIND_ICON[n.kind] ?? "📰"}</div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-navy">{n.title}</div>
                {n.body && <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.body}</div>}
                <div className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <span className="w-2 h-2 rounded-full bg-teal mt-1.5 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { user, isLoading, logout } = useAuth({ redirectOnUnauthenticated: true });
  const profileQ = trpc.profile.me.useQuery(undefined, { enabled: !!user });
  const wallet = trpc.wallet.overview.useQuery(undefined, { enabled: !!user && !!profileQ.data?.profile });
  const notifCount = trpc.social.unreadCount.useQuery(undefined, { enabled: !!user, refetchInterval: 15000 });
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const navigate = useNavigate();

  if (isLoading || (user && profileQ.isLoading)) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="Herbie" className="w-16 h-16 mx-auto animate-pulse" />
          <div className="text-navy font-bold mt-3">Loading Herbie…</div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  const profile = profileQ.data?.profile;
  if (profileQ.data && !profile) return <Navigate to="/onboarding" replace />;

  const rank = rankForXp(profile?.xp ?? 0);
  const next = nextRank(profile?.xp ?? 0);
  const xpPct = next ? Math.min(100, Math.round(((profile!.xp - rank.minXp) / (next.minXp - rank.minXp)) * 100)) : 100;

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-navy flex-col z-30">
        <div className="p-5"><Logo size={34} light /></div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
              <n.icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />{n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 space-y-1">
          <NavLink to="/profile" className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
            <Settings className="w-[18px] h-[18px]" />Profile & Settings
          </NavLink>
          <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors">
            <LogOut className="w-[18px] h-[18px]" />Log out
          </button>
        </div>
      </aside>

      {/* Topbar */}
      <header className="fixed top-0 right-0 left-0 lg:left-60 h-16 bg-white/90 backdrop-blur border-b border-slate-100 z-20 flex items-center gap-3 px-4 lg:px-6">
        <button type="button" className="lg:hidden p-2 -ml-1 text-navy" onClick={() => setMobileNav(true)}><Menu className="w-5 h-5" /></button>
        <div className="lg:hidden"><Logo size={28} withWordmark={false} /></div>
        <button type="button" onClick={() => navigate("/search")}
          className="hidden md:flex items-center gap-2 flex-1 max-w-md bg-slate-100 hover:bg-slate-200/70 transition-colors rounded-xl px-4 py-2 text-sm text-slate-400">
          <Search className="w-4 h-4" /> Search jobs, startups, products, #tags…
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => navigate("/wallet")}
            className="flex items-center gap-1.5 bg-gradient-to-r from-teal to-herbiegreen text-white text-sm font-bold px-3.5 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-sm" title="Herbie Wallet">
            $ {wallet.data ? fmt$(wallet.data.available).replace("$", "") : "…"}
          </button>
          <button type="button" onClick={() => setShowNotifs(true)} className="relative p-2.5 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors" title="Notifications">
            <Bell className="w-5 h-5" />
            {(notifCount.data?.count ?? 0) > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">{notifCount.data!.count}</span>
            )}
          </button>
          <button type="button" onClick={() => navigate("/profile")} className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: profile?.avatarColor ?? "#0FDEBD" }}>
              {(profile?.displayName ?? user.name ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-navy leading-tight">{profile?.displayName ?? user.name}</div>
              <div className="text-[10px] text-slate-400">{rank.icon} {rank.tier} · {profile?.xp ?? 0} XP</div>
            </div>
          </button>
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy/40" onClick={() => setMobileNav(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-navy p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4"><Logo size={30} light /><button type="button" onClick={() => setMobileNav(false)} className="text-white/70"><X className="w-5 h-5" /></button></div>
            <nav className="space-y-1">
              {[...NAV, { to: "/profile", label: "Profile & Settings", icon: Settings }, { to: "/wallet", label: "Wallet", icon: BarChart3 }].map((n) => (
                <NavLink key={n.to} to={n.to} onClick={() => setMobileNav(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${isActive ? "bg-white/15 text-white" : "text-white/60"}`}>
                  <n.icon className="w-[18px] h-[18px]" />{n.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="pt-16 lg:pl-60">
        <div className="p-4 lg:p-8 max-w-7xl mx-auto">
          <Outlet context={{ profile, rank, next, xpPct }} />
        </div>
      </main>

      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      <HerbieJrFloating userName={profile?.displayName ?? user.name ?? "friend"} />
    </div>
  );
}
