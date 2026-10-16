import { cx } from "@/components/ui";
import type { Motivation } from "@/lib/data/motivation";

const DAY = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { weekday: "short", timeZone: "UTC" });

/** Last 7 days — a filled dot for each day with points (the streak, day by day). */
export function WeekStrip({ days }: { days: Motivation["last7"] }) {
  return (
    <ol className="week-strip" aria-label="نشاط آخر ٧ أيام">
      {days.map((d, i) => {
        const active = d.points > 0;
        const name = DAY.format(new Date(`${d.day}T00:00:00Z`));
        return (
          <li key={d.day} className={cx("week-day", active && "is-active", i === days.length - 1 && "is-today")} aria-label={`${name}: ${active ? `${d.points} نقطة` : "لا نشاط"}`}>
            <span className="week-dot" aria-hidden>{active ? "✓" : ""}</span>
            <span aria-hidden>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}
