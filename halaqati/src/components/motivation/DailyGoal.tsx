import { Ring } from "@/components/motivation/Ring";

const GOAL = 10;

/** «هدف اليوم»: ten points a day (e.g. a wird and two tasks, or one recitation). */
export function DailyGoal({ today, streak }: { today: number; streak: number }) {
  const done = Math.min(today, GOAL);
  return (
    <div className="flex items-center gap-4 rounded-[20px] bg-gradient-to-l from-[var(--tint-mint)] to-[var(--tint-sand)] p-4">
      <Ring value={done} max={GOAL} size={84} stroke={10} label={`${done}`} sub={`من ${GOAL}`} ariaLabel={`هدف اليوم: ${done} من ${GOAL} نقاط`} />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-brand-900">🎯 هدف اليوم: {GOAL} نقاط</p>
        <p className="mt-1 text-sm text-ink">{done >= GOAL ? "ما شاء الله، أتممت هدف اليوم 🌿" : `بقي ${GOAL - done} ${GOAL - done === 1 ? "نقطة" : "نقاط"}`}</p>
        <p className="mt-1 text-xs text-muted">
          ورد يومي 3 · مهمة 2 · حضور 5 · تسميع 10+
          {streak > 0 && <> · 🔥 {streak} {streak === 1 ? "يوم" : "أيام"} متتالية</>}
        </p>
      </div>
    </div>
  );
}
