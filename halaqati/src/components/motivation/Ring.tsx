/** Donut progress ring (single value, brand green on a soft track). */
export function Ring({
  value, max = 1, size = 112, stroke = 12, label, sub, ariaLabel,
}: { value: number; max?: number; size?: number; stroke?: number; label: string; sub?: string; ariaLabel: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        {ratio > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chart)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * ratio} ${c}`} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center" aria-hidden>
        <span className="text-xl font-bold leading-none tabular-nums text-ink">{label}</span>
        {sub && <span className="mt-1 text-[0.7rem] text-muted">{sub}</span>}
      </div>
    </div>
  );
}
