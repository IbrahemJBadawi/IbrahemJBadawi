const GOAL = 10;

/** «هدف اليوم»: ten points a day (e.g. a wird and two tasks, or one recitation). */
export function DailyGoal({ today, streak }: { today: number; streak: number }) {
  const pct = Math.min(100, Math.round((today / GOAL) * 100));
  return (
    <div className="rounded-[20px] bg-gradient-to-l from-[var(--tint-mint)] to-[var(--tint-sand)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-bold text-brand-900">🎯 هدف اليوم</p>
        <p className="text-sm font-semibold text-ink"><span className="tabular-nums">{Math.min(today, GOAL)}</span> من {GOAL} نقاط</p>
      </div>
      <div className="goal-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="تقدّم هدف اليوم">
        <div className="goal-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {pct >= 100 ? "ما شاء الله، أتممت هدف اليوم 🌿" : "ورد يومي 3 · مهمة 2 · حضور 5 · تسميع 10+"}
        {streak > 0 && <> · 🔥 {streak} {streak === 1 ? "يوم" : "أيام"} متتالية</>}
      </p>
    </div>
  );
}
