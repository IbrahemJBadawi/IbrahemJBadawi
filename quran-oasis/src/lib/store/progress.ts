/**
 * حسابات التقدم. كل الأرقام مبنية على بيانات المصحف الفعلية:
 * عدد الآيات (6236) وتقسيم صفحات مصحف المدينة (604 صفحة).
 * "الصفحة المقروءة" = مجموع نسب الآيات المقروءة من كل صفحة.
 */
import { addDays, dayKey, daysBetween } from "@/lib/date";
import { countRanges, firstUncovered, normalizeRanges, unionRanges, type Range } from "@/lib/ranges";
import { fromGlobalAyahId, pageOfGlobalAyah, pageRange, TOTAL_AYAHS, TOTAL_PAGES } from "@/lib/quran";
import type { DailyTask, HifzSegment, Khatma, UserState } from "./types";

const PAGE_SIZES: number[] = Array.from({ length: TOTAL_PAGES }, (_, i) => {
  const [a, b] = pageRange(i + 1);
  return b - a + 1;
});

/** عدد الصفحات المكافئ لمجموعة آيات. */
export function pagesEquivalent(ranges: Range[]): number {
  let total = 0;
  for (const [a, b] of normalizeRanges(ranges)) {
    let id = a;
    while (id <= b) {
      const page = pageOfGlobalAyah(id);
      const [, pageEnd] = pageRange(page);
      const end = Math.min(b, pageEnd);
      total += (end - id + 1) / PAGE_SIZES[page - 1];
      id = end + 1;
    }
  }
  return total;
}

export function readingOn(state: Pick<UserState, "readingLog">, day: string) {
  const ranges = state.readingLog[day] ?? [];
  return { ayahs: countRanges(ranges), pages: pagesEquivalent(ranges) };
}

export function goalProgress(state: Pick<UserState, "readingLog" | "settings">, day: string = dayKey()) {
  const { unit, amount, enabled } = state.settings.dailyGoal;
  const r = readingOn(state, day);
  const done = unit === "pages" ? r.pages : r.ayahs;
  return {
    enabled,
    unit,
    target: amount,
    done,
    ratio: amount > 0 ? Math.min(1, done / amount) : 0,
    reached: enabled && amount > 0 && done + 1e-9 >= amount,
  };
}

/** أيام متتالية فيها قراءة، تنتهي اليوم أو أمس (لا نكسر السلسلة قبل نهاية اليوم). */
export function readingStreak(state: Pick<UserState, "readingLog">, today: string = dayKey()): number {
  const has = (d: string) => (state.readingLog[d]?.length ?? 0) > 0;
  let cur = has(today) ? today : addDays(today, -1);
  let n = 0;
  while (has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

export function activeKhatma(state: Pick<UserState, "khatmas">): Khatma | null {
  return Object.values(state.khatmas).find((k) => !k.deleted && k.status === "active") ?? null;
}

export function khatmaProgress(k: Khatma, state: Pick<UserState, "readingLog">, today: string = dayKey()) {
  const ranges = unionRanges(
    ...Object.entries(state.readingLog)
      .filter(([d]) => d >= k.startDate)
      .map(([, r]) => r),
  );
  const ayahsRead = countRanges(ranges);
  const pagesRead = pagesEquivalent(ranges);
  const elapsed = Math.max(0, daysBetween(k.startDate, today));
  const daysLeft = Math.max(1, k.days - elapsed);
  const pagesLeft = Math.max(0, TOTAL_PAGES - pagesRead);
  const next = firstUncovered(ranges, 1, TOTAL_AYAHS);
  // مقدار اليوم = ما تبقى ÷ الأيام المتبقية (بما فيها اليوم)، مضافًا إليه ما قُرئ اليوم
  const readToday = today >= k.startDate ? pagesEquivalent(state.readingLog[today] ?? []) : 0;
  const dailyPages = (pagesLeft + readToday) / daysLeft;
  return {
    ayahsRead,
    pagesRead,
    percent: (ayahsRead / TOTAL_AYAHS) * 100,
    elapsed,
    daysLeft,
    endDate: addDays(k.startDate, k.days - 1),
    dailyPages,
    readToday,
    expectedPages: Math.min(TOTAL_PAGES, (TOTAL_PAGES / k.days) * Math.min(k.days, elapsed + 1)),
    next: next ? fromGlobalAyahId(next) : null,
    complete: ayahsRead >= TOTAL_AYAHS,
  };
}

export interface DhikrLite {
  id: string;
  category: string;
  repeat: number;
}

export function adhkarStatus(list: DhikrLite[], state: Pick<UserState, "adhkarLog">, category: string, day = dayKey()) {
  const items = list.filter((d) => d.category === category);
  const log = state.adhkarLog[day] ?? {};
  const done = items.filter((d) => (log[d.id]?.c ?? 0) >= d.repeat).length;
  return { done, total: items.length, complete: items.length > 0 && done === items.length };
}

export function dueHifz(state: Pick<UserState, "hifz">, today = dayKey()): HifzSegment[] {
  return Object.values(state.hifz)
    .filter((h) => !h.deleted && h.nextReview <= today)
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
}

export function hifzStats(state: Pick<UserState, "hifz">) {
  const segs = Object.values(state.hifz).filter((h) => !h.deleted);
  const ayahs = (status?: HifzSegment["status"]) =>
    segs.filter((s) => !status || s.status === status).reduce((n, s) => n + (s.to - s.from + 1), 0);
  const reviews = segs.reduce((n, s) => n + s.reviews.length, 0);
  return { segments: segs.length, memorizedAyahs: ayahs("memorized"), learningAyahs: ayahs("learning"), reviews };
}

export interface TaskStatus {
  done: boolean;
  /** اكتمل تلقائيًا من نشاط المستخدم الفعلي */
  auto: boolean;
  detail?: string;
}

export function taskStatus(
  task: DailyTask,
  state: UserState,
  adhkar: DhikrLite[],
  day: string = dayKey(),
): TaskStatus {
  const manual = state.taskLog[day]?.[task.id];
  let auto = false;
  let detail: string | undefined;
  switch (task.type) {
    case "reading": {
      const g = goalProgress(state, day);
      auto = g.reached;
      const unit = g.unit === "pages" ? "صفحة" : "آية";
      detail = `${formatAmount(g.done)} من ${g.target} ${unit}`;
      break;
    }
    case "morning":
    case "evening":
    case "sleep":
    case "after-prayer": {
      const st = adhkarStatus(adhkar, state, task.type, day);
      auto = st.complete;
      detail = `${st.done} من ${st.total}`;
      break;
    }
    case "hifz-new":
      auto = Object.values(state.hifz).some((h) => !h.deleted && h.createdAt === day);
      break;
    case "hifz-review": {
      const reviewedToday = Object.values(state.hifz).some((h) => !h.deleted && h.reviews.some((r) => r.date === day));
      const due = dueHifz(state, day).length;
      auto = reviewedToday && due === 0;
      detail = due ? `${due} مقطع مستحق` : reviewedToday ? "تمت المراجعة" : "لا مراجعة مستحقة";
      break;
    }
    case "lesson":
      auto = Object.values(state.lessons).some((l) => !l.deleted && l.completedAt === day);
      break;
    case "oasis":
      auto = !!state.oasisSeen[day];
      break;
  }
  if (manual) return { done: manual.done, auto: false, detail };
  return { done: auto, auto, detail };
}

export function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n < 10 ? n.toFixed(1).replace(/\.0$/, "") : String(Math.round(n));
}
