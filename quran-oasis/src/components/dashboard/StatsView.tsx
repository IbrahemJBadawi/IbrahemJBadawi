"use client";

import { Award, BookOpen, CalendarDays, Flame, GraduationCap, Lock, Sparkles } from "lucide-react";
import { useMemo } from "react";
import type { Dhikr, DhikrCategory } from "@/content/adhkar";
import { WeekChart } from "@/components/plan/WeekChart";
import { Card, CardTitle } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { addDays, dayKey, formatShortDate, lastNDays } from "@/lib/date";
import { countRanges, unionRanges, coversRange } from "@/lib/ranges";
import { globalAyahId, juzStartRef, TOTAL_AYAHS, toArabicDigits } from "@/lib/quran";
import { adhkarStatus, formatAmount, hifzStats, pagesEquivalent, readingOn, readingStreak } from "@/lib/store/progress";
import { useHydrated, useStore } from "@/lib/store/store";

function longestStreak(days: string[]): number {
  const set = new Set(days);
  let best = 0;
  for (const d of set) {
    if (set.has(addDays(d, -1))) continue;
    let n = 1;
    let cur = d;
    while (set.has((cur = addDays(cur, 1)))) n++;
    best = Math.max(best, n);
  }
  return best;
}

const JUZ_RANGES: [number, number][] = Array.from({ length: 30 }, (_, i) => {
  const s = juzStartRef(i + 1);
  const start = globalAyahId(s.surah, s.ayah);
  const nextStart = i < 29 ? (() => { const n = juzStartRef(i + 2); return globalAyahId(n.surah, n.ayah); })() : TOTAL_AYAHS + 1;
  return [start, nextStart - 1];
});

export function StatsView({ adhkar, categories }: { adhkar: Dhikr[]; categories: DhikrCategory[] }) {
  const hydrated = useHydrated();
  const state = useStore((s) => s);
  const today = dayKey();

  const s = useMemo(() => {
    const activeDays = Object.entries(state.readingLog).filter(([, r]) => r.length).map(([d]) => d);
    const all = unionRanges(...Object.values(state.readingLog));
    const covered = countRanges(all);
    const juz = JUZ_RANGES.map(([a, b]) => {
      const inJuz = countRanges(unionRanges(all.map(([x, y]) => [Math.max(x, a), Math.min(y, b)] as [number, number]).filter(([x, y]) => x <= y)));
      return { ratio: inJuz / (b - a + 1), full: coversRange(all, [a, b]) };
    });
    let adhkarDays = 0;
    for (const day of Object.keys(state.adhkarLog)) {
      if (categories.some((c) => adhkarStatus(adhkar, state, c.id, day).complete)) adhkarDays++;
    }
    const lessons = Object.values(state.lessons).filter((l) => !l.deleted).length;
    const totalPagesRead = Object.values(state.readingLog).reduce((n, r) => n + pagesEquivalent(r), 0);
    return {
      streak: readingStreak(state, today),
      longest: longestStreak(activeDays),
      activeDays: activeDays.length,
      covered,
      coveredPages: pagesEquivalent(all),
      totalPagesRead,
      juz,
      adhkarDays,
      lessons,
      hifz: hifzStats(state),
      favorites: Object.values(state.bookmarks).filter((b) => !b.deleted && b.kind === "favorite").length,
    };
  }, [state, adhkar, categories, today]);

  const heat = useMemo(() => lastNDays(35).map((d) => ({ d, ...readingOn(state, d) })), [state]);

  if (!hydrated) return <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />;

  const milestones = [
    { t: "الورد الأول", d: "قرأت أول آياتك في الواحة", ok: s.activeDays >= 1 },
    { t: "أسبوع مع القرآن", d: "سبعة أيام متتالية من القراءة", ok: s.longest >= 7 },
    { t: "شهر من الثبات", d: "ثلاثون يومًا متتالية", ok: s.longest >= 30 },
    { t: "جزء كامل", d: "قرأت جزءًا كاملًا", ok: s.juz.some((j) => j.full) },
    { t: "الختمة الأولى", d: "قرأت القرآن كاملًا", ok: s.covered >= TOTAL_AYAHS },
    { t: "ملازمة الأذكار", d: "أتممت أذكار قسم كامل في سبعة أيام", ok: s.adhkarDays >= 7 },
    { t: "طالب علم", d: "أكملت خمسة دروس", ok: s.lessons >= 5 },
    { t: "حافظ ناشئ", d: "سجّلت حفظ ٥٠ آية", ok: s.hifz.memorizedAyahs >= 50 },
  ];

  const tiles = [
    { icon: Flame, k: "أيام متتالية الآن", v: toArabicDigits(s.streak) },
    { icon: Award, k: "أطول سلسلة", v: toArabicDigits(s.longest) },
    { icon: CalendarDays, k: "أيام القراءة", v: toArabicDigits(s.activeDays) },
    { icon: BookOpen, k: "صفحات مقروءة", v: formatAmount(s.totalPagesRead) },
    { icon: Sparkles, k: "أيام أتممت فيها أذكارًا", v: toArabicDigits(s.adhkarDays) },
    { icon: GraduationCap, k: "دروس مكتملة", v: toArabicDigits(s.lessons) },
  ];

  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <li key={t.k} className="rounded-2xl border border-line bg-surface p-4">
            <t.icon className="h-5 w-5 text-accent" aria-hidden="true" />
            <p className="mt-2 text-2xl font-bold tabular-nums">{t.v}</p>
            <p className="text-xs text-muted">{t.k}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>القراءة هذا الأسبوع</CardTitle>
          <WeekChart />
        </Card>
        <Card>
          <CardTitle>آخر خمسة أسابيع</CardTitle>
          <div className="grid grid-cols-7 gap-1.5" role="list" aria-label="سجل القراءة اليومي">
            {heat.map((x) => {
              const level = x.pages === 0 ? 0 : x.pages < 1 ? 1 : x.pages < 5 ? 2 : 3;
              return (
                <div
                  key={x.d}
                  role="listitem"
                  title={`${formatShortDate(x.d)}: ${formatAmount(x.pages)} صفحة`}
                  aria-label={`${formatShortDate(x.d)}: ${x.ayahs ? `${formatAmount(x.pages)} صفحة` : "لا قراءة"}`}
                  className={cn(
                    "grid aspect-square place-items-center rounded-md text-[9px] font-bold",
                    ["bg-surface-2 text-transparent", "bg-accent/30 text-fg", "bg-accent/60 text-fg", "bg-primary text-primary-fg"][level],
                    x.d === today && "ring-2 ring-gold",
                  )}
                >
                  {level > 0 ? "•" : ""}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">كل مربع يوم؛ ويدل لونه ونقطته على وجود قراءة، ويزداد عمقه بزيادتها.</p>
        </Card>
      </div>

      <Card>
        <CardTitle>ما قرأته من المصحف</CardTitle>
        <p className="mb-3 text-sm text-muted">
          قرأت {toArabicDigits(s.covered)} آية مختلفة من ٦٢٣٦ ({formatAmount(Math.floor((s.covered / TOTAL_AYAHS) * 1000) / 10)}٪) — ما يعادل {formatAmount(s.coveredPages)} صفحة.
        </p>
        <ul className="grid grid-cols-6 gap-2 sm:grid-cols-10">
          {s.juz.map((j, i) => (
            <li key={i} className="text-center" aria-label={`الجزء ${i + 1}: ${Math.round(j.ratio * 100)}٪`}>
              <div className="relative h-14 overflow-hidden rounded-lg bg-surface-2">
                <div className={cn("absolute inset-x-0 bottom-0", j.full ? "bg-primary" : "bg-accent/70")} style={{ height: `${j.ratio * 100}%` }} />
              </div>
              <span className="mt-1 block text-[11px] text-muted">{toArabicDigits(i + 1)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle icon={<Award className="h-5 w-5" />}>محطات في رحلتك</CardTitle>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {milestones.map((m) => (
            <li key={m.t} className={cn("rounded-2xl p-4", m.ok ? "bg-gold-soft" : "bg-surface-2")}>
              <p className="flex items-center gap-2 font-bold">
                {m.ok ? <Award className="h-5 w-5 text-gold-fg" aria-hidden="true" /> : <Lock className="h-4 w-4 text-muted" aria-hidden="true" />}
                {m.t}
              </p>
              <p className="mt-1 text-sm text-muted">{m.d}</p>
              <p className="mt-1 text-xs font-semibold">{m.ok ? "تحققت" : "لم تتحقق بعد"}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
