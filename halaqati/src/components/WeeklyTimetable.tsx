import { WEEKDAYS } from "@/lib/labels";
import type { ScheduleSlot } from "@/lib/format";

export type TimetableHalaqa = { id: string; name: string; timezone: string; schedule: unknown; href?: string };

/** Weekly timetable built from each halaqa's recurring schedule (in its own timezone). */
export function WeeklyTimetable({ halaqat, today }: { halaqat: TimetableHalaqa[]; today: number }) {
  const byDay = WEEKDAYS.map(() => [] as Array<{ halaqa: TimetableHalaqa; slot: ScheduleSlot }>);
  for (const h of halaqat) {
    if (!Array.isArray(h.schedule)) continue;
    for (const slot of h.schedule as ScheduleSlot[]) {
      if (typeof slot?.day === "number" && slot.day >= 0 && slot.day <= 6) byDay[slot.day].push({ halaqa: h, slot });
    }
  }
  byDay.forEach((d) => d.sort((a, b) => a.slot.start.localeCompare(b.slot.start)));
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {byDay.map((items, day) => (
        <li key={day} className={`rounded-xl border bg-white p-3 ${day === today ? "border-brand-600 ring-1 ring-brand-600" : "border-line"}`}>
          <p className="mb-2 font-bold text-brand-900">
            {WEEKDAYS[day]} {day === today && <span className="text-sm font-semibold text-gold-dark">(اليوم)</span>}
          </p>
          {items.length === 0 ? (
            <p className="text-sm text-muted">لا توجد حلقات</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {items.map(({ halaqa, slot }, i) => (
                <li key={`${halaqa.id}-${i}`} className="rounded-lg bg-brand-50 px-2 py-1.5 text-sm">
                  <span className="font-semibold" dir="ltr">{slot.start}</span>
                  <span className="text-muted"> · {slot.duration} د</span>
                  <span className="block font-semibold text-ink">
                    {halaqa.href ? <a href={halaqa.href} className="underline">{halaqa.name}</a> : halaqa.name}
                  </span>
                  <span className="block text-xs text-muted" dir="ltr">{halaqa.timezone}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
