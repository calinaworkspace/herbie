export function Logo({ size = 36, withWordmark = true, light = false }: { size?: number; withWordmark?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img src="/logo.png" alt="Herbie logo" style={{ height: size, width: size }} className="object-contain" />
      {withWordmark && (
        <div className="leading-tight">
          <div className={`font-extrabold tracking-tight ${light ? "text-white" : "text-navy"}`} style={{ fontSize: size * 0.5 }}>
            HERBIE
          </div>
          {size >= 32 && (
            <div className={`${light ? "text-white/60" : "text-slate-400"}`} style={{ fontSize: Math.max(9, size * 0.22) }}>
              Grow together. Work. Invest. Shop.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Herbie Jr. robot mascot — inline SVG in brand gradient */
export function HerbieJrMascot({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="jr-g" x1="0" y1="0" x2="64" y2="64">
          <stop offset="0%" stopColor="#0FDEBD" />
          <stop offset="100%" stopColor="#16C98D" />
        </linearGradient>
      </defs>
      <rect x="10" y="18" width="44" height="34" rx="12" fill="url(#jr-g)" />
      <rect x="25" y="8" width="14" height="10" rx="4" fill="url(#jr-g)" />
      <circle cx="32" cy="7" r="4" fill="#0FDEBD" />
      <circle cx="24" cy="34" r="4.5" fill="white" />
      <circle cx="40" cy="34" r="4.5" fill="white" />
      <circle cx="24" cy="34" r="2" fill="#1D508D" />
      <circle cx="40" cy="34" r="2" fill="#1D508D" />
      <path d="M24 44 Q32 50 40 44" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M52 22 Q58 14 60 20 Q56 25 52 22 Z" fill="#16C98D" />
    </svg>
  );
}
