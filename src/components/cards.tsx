import { Heart, Bookmark, MessageCircle, Send, MapPin, Star, BadgeCheck, Briefcase } from "lucide-react";
import type { Freelancer, Job, Product, Startup } from "@contracts/types";
import { fmt$, fmtCompact, rankIcon } from "@/lib/herbie";

export function Tag({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-light text-teal-dark hover:bg-teal/25 transition-colors">
      #{label}
    </button>
  );
}

function ActionBtn({ icon, label, active, activeClass, onClick, title }: {
  icon: React.ReactNode; label?: string; active?: boolean; activeClass?: string; onClick?: () => void; title: string;
}) {
  return (
    <button type="button" title={title} onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all hover:-translate-y-0.5 ${
        active ? (activeClass ?? "border-teal bg-teal-light text-teal-dark") : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
      }`}>
      {icon}{label && <span>{label}</span>}
    </button>
  );
}

export interface JobRow { job: Job; startupName: string | null; startupEmoji: string | null; startupGradient: string | null; startupVerified: boolean | null }

export function JobCard({ row, applied, liked, saved, onApply, onLike, onSave, onMessage, onTag }: {
  row: JobRow; applied?: boolean; liked?: boolean; saved?: boolean;
  onApply: () => void; onLike: () => void; onSave: () => void; onMessage: () => void; onTag?: (t: string) => void;
}) {
  const { job } = row;
  const pay = job.payType === "hourly" ? `${fmt$(job.payMin)}–${fmt$(job.payMax)}/hr` : `${fmt$(job.payMin)}–${fmt$(job.payMax)} fixed`;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${row.startupGradient ?? "from-teal-400 to-green-500"} flex items-center justify-center text-xl shrink-0`}>
          {row.startupEmoji ?? "🚀"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-navy leading-snug">{job.title}</div>
          <div className="text-sm text-slate-500 flex items-center gap-1 flex-wrap">
            {row.startupName}
            {row.startupVerified && <BadgeCheck className="w-3.5 h-3.5 text-link" />}
            <span className="text-slate-300">·</span>
            <MapPin className="w-3 h-3" /> {job.location}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-herbiegreen-dark text-sm">{pay}</div>
          <div className="text-[11px] text-slate-400 capitalize">{job.requirementType === "interview" ? "Straight to interview" : job.requirementType === "attachment" ? "Portfolio required" : `${job.questions.length} questions`}</div>
        </div>
      </div>
      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{job.description}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">{job.tags.map((t) => <Tag key={t} label={t} onClick={onTag ? () => onTag(t) : undefined} />)}</div>
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <button type="button" onClick={onApply} disabled={applied}
          className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg transition-all ${applied ? "bg-slate-100 text-slate-400 cursor-default" : "bg-herbiegreen text-white hover:bg-herbiegreen-dark hover:-translate-y-0.5 shadow-sm"}`}>
          <Send className="w-3.5 h-3.5" /> {applied ? "Applied ✓" : "Apply"}
        </button>
        <ActionBtn title="Like" icon={<Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-400 text-red-400" : ""}`} />} active={liked} activeClass="border-red-200 bg-red-50 text-red-400" onClick={onLike} />
        <ActionBtn title="Save" icon={<Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-link text-link" : ""}`} />} active={saved} activeClass="border-blue-200 bg-blue-50 text-link" onClick={onSave} />
        <ActionBtn title="Message startup" icon={<MessageCircle className="w-3.5 h-3.5" />} label="Message" onClick={onMessage} />
      </div>
    </div>
  );
}

export function StartupCard({ startup, liked, saved, isInvestor, onView, onInvest, onLike, onSave, onMessage, onTag }: {
  startup: Startup; liked?: boolean; saved?: boolean; isInvestor?: boolean;
  onView: () => void; onInvest?: () => void; onLike: () => void; onSave: () => void; onMessage: () => void; onTag?: (t: string) => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-3">
        <button type="button" onClick={onView} className={`w-12 h-12 rounded-xl bg-gradient-to-br ${startup.gradient} flex items-center justify-center text-2xl shrink-0`}>
          {startup.emoji}
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onView} className="font-bold text-navy hover:text-link transition-colors flex items-center gap-1.5 text-left">
            {startup.name} {startup.verified && <BadgeCheck className="w-4 h-4 text-link shrink-0" />}
          </button>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <span>{rankIcon(startup.rankTier)} {startup.rankTier}</span><span>·</span><span>{startup.fundingStage}</span><span>·</span><span>{startup.location}</span>
          </div>
        </div>
      </div>
      <p className="text-sm text-slate-600 mt-3 line-clamp-2">{startup.pitch}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">{startup.industryTags.map((t) => <Tag key={t} label={t} onClick={onTag ? () => onTag(t) : undefined} />)}</div>
      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
        <div className="bg-slate-50 rounded-lg py-2"><div className="text-xs font-bold text-navy">{fmtCompact(startup.annualRevenue)}</div><div className="text-[10px] text-slate-400">Revenue/yr</div></div>
        <div className="bg-slate-50 rounded-lg py-2"><div className="text-xs font-bold text-herbiegreen-dark">{fmtCompact(startup.annualProfit)}</div><div className="text-[10px] text-slate-400">Profit/yr</div></div>
        <div className="bg-slate-50 rounded-lg py-2"><div className="text-xs font-bold text-link">{fmtCompact(startup.totalRaised)}</div><div className="text-[10px] text-slate-400">Raised</div></div>
      </div>
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {isInvestor && startup.openForInvestment && (
          <button type="button" onClick={onInvest}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-herbiegreen text-white hover:bg-herbiegreen-dark hover:-translate-y-0.5 transition-all shadow-sm">
            💰 Invest
          </button>
        )}
        <ActionBtn title="Like" icon={<Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-400 text-red-400" : ""}`} />} active={liked} activeClass="border-red-200 bg-red-50 text-red-400" onClick={onLike} />
        <ActionBtn title="Save" icon={<Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-link text-link" : ""}`} />} active={saved} activeClass="border-blue-200 bg-blue-50 text-link" onClick={onSave} />
        <ActionBtn title="Message startup" icon={<MessageCircle className="w-3.5 h-3.5" />} label="Message" onClick={onMessage} />
        {startup.openForFreelancers && <span className="ml-auto text-[11px] font-medium text-teal-dark bg-teal-light px-2 py-1 rounded-full">Hiring freelancers</span>}
      </div>
    </div>
  );
}

export function FreelancerCard({ freelancer, liked, saved, canHire, onHire, onLike, onSave, onMessage, onTag }: {
  freelancer: Freelancer; liked?: boolean; saved?: boolean; canHire?: boolean;
  onHire?: () => void; onLike: () => void; onSave: () => void; onMessage: () => void; onTag?: (t: string) => void;
}) {
  const f = freelancer;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: f.avatarColor }}>
          {f.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-navy">{f.name}</div>
          <div className="text-sm text-slate-500 truncate">{f.headline}</div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{rankIcon(f.rankTier)} {f.rankTier}</span>
            <span className="flex items-center gap-0.5 text-amber-500"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{(f.rating / 10).toFixed(1)}</span>
            <span className="flex items-center gap-0.5"><Briefcase className="w-3 h-3" />{f.jobsCompleted} jobs</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-herbiegreen-dark">{fmt$(f.hourlyRate)}/hr</div>
          <div className="text-[11px] text-slate-400">{f.availability}</div>
        </div>
      </div>
      {f.bio && <p className="text-sm text-slate-600 mt-3 line-clamp-2">{f.bio}</p>}
      <div className="flex flex-wrap gap-1.5 mt-3">{f.tags.map((t) => <Tag key={t} label={t} onClick={onTag ? () => onTag(t) : undefined} />)}</div>
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {canHire && (
          <button type="button" onClick={onHire}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-herbiegreen text-white hover:bg-herbiegreen-dark hover:-translate-y-0.5 transition-all shadow-sm">
            ⚡ Hire
          </button>
        )}
        <ActionBtn title="Like" icon={<Heart className={`w-3.5 h-3.5 ${liked ? "fill-red-400 text-red-400" : ""}`} />} active={liked} activeClass="border-red-200 bg-red-50 text-red-400" onClick={onLike} />
        <ActionBtn title="Save" icon={<Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-link text-link" : ""}`} />} active={saved} activeClass="border-blue-200 bg-blue-50 text-link" onClick={onSave} />
        <ActionBtn title="Message" icon={<MessageCircle className="w-3.5 h-3.5" />} label="Message" onClick={onMessage} />
      </div>
    </div>
  );
}

export function ProductCard({ product, startupName, onAdd, onView }: {
  product: Product; startupName: string | null; onAdd: () => void; onView: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      <button type="button" onClick={onView} className={`w-full h-36 bg-gradient-to-br ${product.gradient} flex items-center justify-center text-6xl`}>
        {product.emoji}
      </button>
      <div className="p-4">
        <button type="button" onClick={onView} className="font-bold text-navy text-sm leading-snug text-left hover:text-link transition-colors line-clamp-2">{product.name}</button>
        <div className="text-xs text-slate-400 mt-1">{startupName}</div>
        <div className="flex items-center gap-1 mt-2 text-xs">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-slate-700">{(product.rating / 10).toFixed(1)}</span>
          <span className="text-slate-400">({product.reviewCount})</span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-400">{product.sales.toLocaleString()} sold</span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="font-extrabold text-navy text-lg">{fmt$(product.price)}</div>
          <button type="button" onClick={onAdd}
            className="text-xs font-semibold px-3.5 py-2 rounded-lg bg-herbiegreen text-white hover:bg-herbiegreen-dark transition-colors shadow-sm">
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}
