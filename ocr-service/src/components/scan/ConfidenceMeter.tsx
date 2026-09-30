/** Circular confidence indicator (0-100) coloured by band. */
export function ConfidenceMeter({ value, size = 84 }: { value: number; size?: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = pct >= 80 ? "var(--color-sf-error)" : pct >= 50 ? "var(--color-sf-warning)" : "var(--color-sf-brand)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`Match confidence ${pct}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-sf-border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-xl font-bold text-sf-text">{pct}%</span>
        <span className="mt-0.5 text-[10px] uppercase tracking-wide text-sf-text-muted">match</span>
      </div>
    </div>
  );
}
