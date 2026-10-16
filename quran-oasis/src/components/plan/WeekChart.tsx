"use client";

import { useMemo } from "react";
import { lastNDays, weekdayShort } from "@/lib/date";
import { formatAmount, readingOn } from "@/lib/store/progress";
import { useStore } from "@/lib/store/store";

/** مخطط أعمدة بسيط لقراءة آخر 7 أيام (بالصفحات المكافئة). */
export function WeekChart({ days = 7 }: { days?: number }) {
  const readingLog = useStore((s) => s.readingLog);
  const goal = useStore((s) => s.settings.dailyGoal);
  const data = useMemo(
    () => lastNDays(days).map((d) => ({ d, ...readingOn({ readingLog }, d) })),
    [readingLog, days],
  );
  const value = (x: (typeof data)[number]) => (goal.unit === "pages" ? x.pages : x.ayahs);
  const max = Math.max(goal.enabled ? goal.amount : 0, ...data.map(value), 1);
  const total = data.reduce((n, x) => n + value(x), 0);
  const unit = goal.unit === "pages" ? "صفحة" : "آية";
  return (
    <figure>
      <div className="flex h-36 items-end gap-2" role="img" aria-label={`القراءة خلال آخر ${days} أيام: المجموع ${formatAmount(total)} ${unit}`}>
        {data.map((x, i) => {
          const v = value(x);
          const h = Math.max(v > 0 ? 6 : 2, (v / max) * 100);
          const isToday = i === data.length - 1;
          return (
            <div key={x.d} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-semibold text-muted tabular-nums">{v > 0 ? formatAmount(v) : ""}</span>
              <div className="relative flex h-24 w-full items-end justify-center">
                {goal.enabled && (
                  <div className="absolute inset-x-0 border-t border-dashed border-gold" style={{ bottom: `${(goal.amount / max) * 100}%` }} aria-hidden="true" />
                )}
                <div className={`w-full max-w-8 rounded-t-lg ${isToday ? "bg-primary" : "bg-accent"}`} style={{ height: `${h}%`, opacity: v > 0 ? 1 : 0.25 }} />
              </div>
              <span className={`text-[11px] ${isToday ? "font-bold text-fg" : "text-muted"}`}>{isToday ? "اليوم" : weekdayShort(x.d)}</span>
            </div>
          );
        })}
      </div>
      <figcaption className="mt-2 text-xs text-muted">
        المجموع: {formatAmount(total)} {unit}
        {goal.enabled && " · الخط المتقطع = هدفك اليومي"}
      </figcaption>
    </figure>
  );
}
