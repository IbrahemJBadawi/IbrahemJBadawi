"use client";

import { ChevronLeft, Heart } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { Dhikr, DhikrCategory } from "@/content/adhkar";
import { Badge, Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/States";
import { dayKey } from "@/lib/date";
import { adhkarStatus } from "@/lib/store/progress";
import { toArabicDigits } from "@/lib/quran";
import { useHydrated, useStore } from "@/lib/store/store";
import { CATEGORY_ICONS } from "./icons";
import { DhikrText } from "./DhikrText";

export function AdhkarHome({ categories, adhkar }: { categories: DhikrCategory[]; adhkar: Dhikr[] }) {
  const hydrated = useHydrated();
  const log = useStore((s) => s.adhkarLog);
  const favs = useStore((s) => s.adhkarFavorites);
  const today = dayKey();
  const favorites = useMemo(
    () => adhkar.filter((d) => favs[d.id] && !favs[d.id].deleted),
    [adhkar, favs],
  );

  return (
    <div className="space-y-8">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => {
          const Icon = CATEGORY_ICONS[c.icon] ?? CATEGORY_ICONS.hands;
          const st = adhkarStatus(adhkar, { adhkarLog: log }, c.id, today);
          return (
            <li key={c.id}>
              <Link
                href={`/adhkar/${c.id}`}
                className="flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 transition-colors hover:border-accent focus-ring"
              >
                <span className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                    <Icon className="h-6 w-6" />
                  </span>
                  {hydrated && st.complete && <Badge tone="success">✓ أُنجزت اليوم</Badge>}
                </span>
                <span className="mt-4 text-lg font-bold">{c.title}</span>
                <span className="mt-1 flex-1 text-sm text-muted">{c.description}</span>
                <span className="mt-4 flex items-center gap-3">
                  <ProgressBar value={hydrated && st.total ? st.done / st.total : 0} label={`تقدم ${c.title}`} />
                  <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">
                    {toArabicDigits(hydrated ? st.done : 0)} من {toArabicDigits(st.total)}
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="fav-adhkar">
        <Card>
          <CardTitle icon={<Heart className="h-5 w-5" />}>
            <span id="fav-adhkar">أذكاري المفضلة</span>
          </CardTitle>
          {!hydrated ? null : favorites.length ? (
            <ul className="divide-y divide-line">
              {favorites.map((d) => (
                <li key={d.id} className="py-4">
                  <DhikrText dhikr={d} compact />
                  <Link href={`/adhkar/${d.category}#${d.id}`} className="mt-2 inline-block text-sm font-semibold text-accent focus-ring rounded">
                    فتح في {categories.find((c) => c.id === d.category)?.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="لا توجد أذكار مفضلة بعد" icon={<Heart className="h-6 w-6" />}>
              اضغط على رمز القلب بجانب أي ذكر لإضافته هنا.
            </EmptyState>
          )}
        </Card>
      </section>
    </div>
  );
}
