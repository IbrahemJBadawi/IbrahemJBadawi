import type { OasisMoment } from "@/content/types";
import { parseDayKey } from "@/lib/date";

/**
 * لحظة اليوم: المجدولة لهذا اليوم إن وُجدت، وإلا لحظة من المكتبة الدورية المنشورة
 * (محتوى مراجَع مسبقًا، لا يُولَّد آليًا). إن لم يوجد محتوى منشور تعيد null.
 */
export function pickMomentForDay(moments: OasisMoment[], day: string): OasisMoment | null {
  const scheduled = moments.find((m) => m.publishDate === day);
  if (scheduled) return scheduled;
  const library = moments.filter((m) => !m.publishDate).sort((a, b) => a.id.localeCompare(b.id));
  if (!library.length) return null;
  const dayNumber = Math.floor(parseDayKey(day).getTime() / 86_400_000 + 0.5);
  return library[((dayNumber % library.length) + library.length) % library.length];
}
