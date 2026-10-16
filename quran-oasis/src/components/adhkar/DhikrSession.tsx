"use client";

import { ArrowRight, Check, ChevronDown, Heart, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Dhikr, DhikrCategory } from "@/content/adhkar";
import { cn } from "@/components/ui/cn";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { dayKey } from "@/lib/date";
import { toArabicDigits } from "@/lib/quran";
import { resetDhikrCounts, setDhikrCount, toggleDhikrFavorite } from "@/lib/store/actions";
import { getState, useHydrated, useStore } from "@/lib/store/store";
import { DhikrText } from "./DhikrText";

function vibrate(ms: number) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}

export function DhikrSession({ category, items }: { category: DhikrCategory; items: Dhikr[] }) {
  const hydrated = useHydrated();
  const today = dayKey();
  const log = useStore((s) => s.adhkarLog[today]);
  const favs = useStore((s) => s.adhkarFavorites);
  const toast = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const refs = useRef(new Map<string, HTMLElement>());

  const count = (id: string) => (hydrated ? (log?.[id]?.c ?? 0) : 0);
  const done = items.filter((d) => count(d.id) >= d.repeat).length;
  const allDone = items.length > 0 && done === items.length;

  // الانتقال إلى أول ذكر غير مكتمل (أو إلى الذكر في رابط #id)
  useEffect(() => {
    if (!hydrated || current) return;
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const target = items.find((d) => d.id === hash) ?? items.find((d) => count(d.id) < d.repeat);
    if (target) {
      setCurrent(target.id);
      if (hash || items[0]?.id !== target.id) {
        requestAnimationFrame(() => refs.current.get(target.id)?.scrollIntoView({ block: "center" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  const goNext = (fromId: string) => {
    const i = items.findIndex((d) => d.id === fromId);
    const next = items.slice(i + 1).find((d) => count(d.id) < d.repeat) ?? items[i + 1];
    if (next) {
      setCurrent(next.id);
      setTimeout(() => refs.current.get(next.id)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    }
  };

  const tap = (d: Dhikr) => {
    // قراءة القيمة الحالية من المخزن مباشرة لتفادي ضياع النقرات السريعة المتتالية
    const c = getState().adhkarLog[today]?.[d.id]?.c ?? 0;
    if (c >= d.repeat) return;
    const nextCount = c + 1;
    setDhikrCount(d.id, nextCount);
    setCurrent(d.id);
    if (nextCount >= d.repeat) {
      vibrate(35);
      const remaining = items.filter((x) => x.id !== d.id && count(x.id) < x.repeat).length;
      if (remaining === 0) toast(`أتممتَ ${category.title}، تقبّل الله منك`);
      else setTimeout(() => goNext(d.id), 450);
    } else vibrate(8);
  };

  if (!items.length) {
    return (
      <EmptyState title="لا توجد أذكار في هذا القسم حاليًا">
        <Link href="/adhkar" className="text-accent underline">
          العودة إلى الأذكار
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/adhkar" className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          الأذكار
        </Link>
        <button
          type="button"
          onClick={() => setConfirmReset(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          إعادة الضبط
        </button>
      </div>

      <header className="sticky top-16 z-30 -mx-4 mb-5 border-b border-line bg-bg/95 px-4 pb-3 pt-1 backdrop-blur">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{category.title}</h1>
            <p className="text-sm text-muted">{category.description}</p>
          </div>
          <p className="shrink-0 text-sm font-bold tabular-nums" aria-live="polite">
            {done} / {items.length}
          </p>
        </div>
        <ProgressBar className="mt-2" value={done / items.length} label={`تقدم ${category.title}`} />
      </header>

      {allDone && (
        <div role="status" className="mb-5 rounded-[var(--radius-card)] bg-accent-soft p-4 text-center font-semibold text-success">
          أتممتَ {category.title} لهذا اليوم. تقبّل الله منك.
        </div>
      )}

      <ol className="space-y-4">
        {items.map((d, i) => {
          const c = count(d.id);
          const complete = c >= d.repeat;
          const fav = !!favs[d.id] && !favs[d.id].deleted;
          const isCurrent = current === d.id;
          return (
            <li
              key={d.id}
              id={d.id}
              ref={(el) => {
                if (el) refs.current.set(d.id, el);
              }}
              className={cn(
                "scroll-mt-40 rounded-[var(--radius-card)] border bg-surface p-5 transition-colors",
                isCurrent ? "border-accent shadow-sm" : "border-line",
                complete && !isCurrent && "opacity-75",
              )}
            >
              <div className="mb-3 flex items-center justify-between text-xs font-semibold text-muted">
                <span>
                  {toArabicDigits(i + 1)} من {toArabicDigits(items.length)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    toggleDhikrFavorite(d.id);
                    toast(fav ? "أُزيل من المفضلة" : "أُضيف إلى المفضلة");
                  }}
                  aria-pressed={fav}
                  aria-label={fav ? "إزالة من المفضلة" : "إضافة إلى المفضلة"}
                  className={cn("rounded-full p-2 focus-ring", fav ? "text-danger" : "text-muted hover:bg-surface-2")}
                >
                  <Heart className={cn("h-5 w-5", fav && "fill-current")} />
                </button>
              </div>

              <DhikrText dhikr={d} />

              {(d.virtue || d.note) && (
                <div className="mt-3 space-y-1 rounded-xl bg-surface-2 p-3 text-sm leading-relaxed text-muted">
                  {d.virtue && (
                    <p>
                      <span className="font-semibold text-fg">الفضل: </span>
                      {d.virtue}
                    </p>
                  )}
                  {d.note && <p>{d.note}</p>}
                </div>
              )}
              <p className="mt-3 text-xs text-muted">
                <span className="font-semibold">المصدر: </span>
                {d.source}
              </p>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => tap(d)}
                  disabled={complete}
                  aria-label={complete ? "اكتمل هذا الذكر" : `عدّ التكرار، ${c} من ${d.repeat}`}
                  className={cn(
                    "flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl text-lg font-bold transition-transform focus-ring active:scale-[0.98]",
                    complete ? "bg-accent-soft text-success" : "bg-primary text-primary-fg",
                  )}
                >
                  {complete ? (
                    <>
                      <Check className="h-6 w-6" aria-hidden="true" />
                      تمّ
                    </>
                  ) : (
                    <span className="tabular-nums">
                      {c} / {d.repeat}
                      {d.repeat > 1 && <span className="mr-2 text-sm font-semibold opacity-80">اضغط للعدّ</span>}
                    </span>
                  )}
                </button>
                {i < items.length - 1 && (
                  <button
                    type="button"
                    onClick={() => goNext(d.id)}
                    className="grid h-16 w-16 place-items-center rounded-2xl border border-line text-muted hover:bg-surface-2 focus-ring"
                    aria-label="الذكر التالي"
                  >
                    <ChevronDown className="h-6 w-6" />
                  </button>
                )}
              </div>
              {d.repeat > 1 && c > 0 && !complete && (
                <button
                  type="button"
                  onClick={() => setDhikrCount(d.id, 0)}
                  className="mt-2 text-xs font-semibold text-muted underline focus-ring rounded"
                >
                  تصفير هذا العدّاد
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <ConfirmDialog
        open={confirmReset}
        title="إعادة ضبط العدّادات"
        message={`سيُعاد ضبط عدّادات ${category.title} لهذا اليوم. هل تريد المتابعة؟`}
        confirmLabel="إعادة الضبط"
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          resetDhikrCounts(items.map((d) => d.id));
          setCurrent(items[0].id);
          window.scrollTo({ top: 0, behavior: "smooth" });
          toast("أُعيد ضبط العدّادات");
        }}
      />
    </div>
  );
}
