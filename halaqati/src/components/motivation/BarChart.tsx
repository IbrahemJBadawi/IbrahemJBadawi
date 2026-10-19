export type BarDatum = { key: string; label: string; value: number; tip: string };

/**
 * Single-series bar chart (brand green, validated against light & dark
 * surfaces). The title names the series, so there is no legend; every bar has
 * a hover/focus tooltip and the same numbers are available as a table.
 */
export function BarChart({ title, data, unit, height = 140 }: { title: string; data: BarDatum[]; unit: string; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const every = Math.ceil(data.length / 7);
  return (
    <figure className="m-0">
      <figcaption className="mb-1 font-bold text-ink">{title}</figcaption>
      <div className="chart-bars" style={{ height }} role="img" aria-label={`${title}: ${data.map((d) => `${d.label} ${d.value}`).join("، ")}`}>
        {data.map((d) => (
          <div key={d.key} className="chart-bar-wrap" tabIndex={0} aria-label={d.tip}>
            <div className="chart-bar" style={{ height: `${(d.value / max) * 100}%` }} />
            <span className="chart-tip" aria-hidden>{d.tip}</span>
          </div>
        ))}
      </div>
      <div className="chart-axis" aria-hidden>
        {data.map((d, i) => <span key={d.key}>{(data.length - 1 - i) % every === 0 ? d.label : ""}</span>)}
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
