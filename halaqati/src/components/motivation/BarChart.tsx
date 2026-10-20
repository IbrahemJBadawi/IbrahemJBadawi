export type BarDatum = { key: string; label: string; value: number; tip: string };

/**
 * Single-series capsule chart (brand green, validated on light & dark
 * surfaces). The title names the series, so there is no legend. The current
 * period (last bar by default) is solid and labelled; the rest are hatched in
 * the same hue. Every bar has a hover/focus tooltip and a table view.
 */
export function BarChart({
  title, data, unit, height = 160, currentKey, showTotal = true,
}: { title: string; data: BarDatum[]; unit: string; height?: number; currentKey?: string; showTotal?: boolean }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const every = Math.ceil(data.length / 8);
  const current = currentKey ?? data[data.length - 1]?.key;
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <figure className="m-0">
      <figcaption className="mb-1 flex items-baseline justify-between gap-2">
        <span className="font-bold text-ink">{title}</span>
        {showTotal && <span className="text-xs text-muted">المجموع <strong className="tabular-nums text-ink">{Math.round(total * 10) / 10}</strong></span>}
      </figcaption>
      <div className="chart-bars" style={{ height }} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join("، ")}`}>
        {data.map((d) => {
          const isCurrent = d.key === current;
          const pct = d.value > 0 ? Math.max(8, (d.value / max) * 100) : 0;
          return (
            <div key={d.key} className="chart-bar-wrap" tabIndex={0} aria-label={d.tip}>
              <div className="chart-track">
                {pct > 0 && <div className={`chart-bar${isCurrent ? " is-current" : ""}`} style={{ height: `${pct}%` }} />}
                {isCurrent && <span className="chart-value" aria-hidden style={{ bottom: `calc(${pct}% + 4px)` }}>{d.value}</span>}
              </div>
              <span className="chart-tip" aria-hidden>{d.tip}</span>
            </div>
          );
        })}
      </div>
      <div className="chart-axis" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className={d.key === current ? "is-current" : undefined}>
            {d.key === current || (data.length - 1 - i) % every === 0 ? d.label : ""}
          </span>
        ))}
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer font-semibold text-brand-800">عرض كجدول</summary>
        <table className="mt-2 w-full text-start">
          <thead><tr className="text-muted"><th className="py-1 text-start font-semibold">الفترة</th><th className="py-1 text-start font-semibold">{unit}</th></tr></thead>
          <tbody>
            {data.map((d) => <tr key={d.key} className="border-t border-line"><td className="py-1">{d.label}</td><td className="py-1 tabular-nums">{d.value}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

const SHORT = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { day: "numeric", month: "short", timeZone: "UTC" });
export const weekLabel = (iso: string) => SHORT.format(new Date(`${iso}T00:00:00Z`));
