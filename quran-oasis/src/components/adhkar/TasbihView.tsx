"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { TASBIH_PHRASES, TASBIH_TARGETS } from "@/content/tasbih";
import { ProgressRing } from "@/components/ui/Progress";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { dayKey } from "@/lib/date";
import { setDevice, useDevice } from "@/lib/device";
import { toArabicDigits } from "@/lib/quran";
import { setTasbihCount } from "@/lib/store/actions";
import { getState, useHydrated, useStore } from "@/lib/store/store";

export function TasbihView() {
  const hydrated = useHydrated();
  const toast = useToast();
  const phraseId = useDevice((s) => s.tasbihPhrase);
  const target = useDevice((s) => s.tasbihTarget);
  const today = dayKey();
  const todayLog = useStore((s) => s.tasbih[today]);
  const [pulse, setPulse] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const phrase = TASBIH_PHRASES.find((p) => p.id === phraseId) ?? TASBIH_PHRASES[0];
  const total = hydrated ? (todayLog?.[phrase.id]?.c ?? 0) : 0;
  const inRound = target ? total % target : total;
  const rounds = target ? Math.floor(total / target) : 0;
  const shown = target && total > 0 && inRound === 0 ? target : inRound;
  const totalToday = hydrated ? Object.values(todayLog ?? {}).reduce((n, x) => n + x.c, 0) : 0;

  const tap = () => {
    const cur = getState().tasbih[today]?.[phrase.id]?.c ?? 0;
    const next = cur + 1;
    setTasbihCount(phrase.id, next);
    setPulse((p) => p + 1);
    try {
      navigator.vibrate?.(target && next % target === 0 ? [30, 60, 30] : 8);
    } catch {}
    if (target && next % target === 0) toast(`أتممتَ ${toArabicDigits(target)} — ${phrase.text}`);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="الذكر">
        {TASBIH_PHRASES.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === phrase.id}
            onClick={() => setDevice({ tasbihPhrase: p.id })}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 font-naskh text-base font-bold transition-colors focus-ring",
              p.id === phrase.id ? "bg-primary text-primary-fg" : "bg-surface-2 text-fg hover:bg-accent-soft",
            )}
          >
            {p.text}
          </button>
        ))}
      </div>

      <button
        id="tasbih-tap"
        type="button"
        onClick={tap}
        aria-label={`تسبيح: ${phrase.text}. العدد ${total}`}
        className="hero-gradient card-soft relative flex w-full select-none flex-col items-center rounded-[2rem] px-6 pb-8 pt-7 focus-ring active:scale-[0.99]"
      >
        <span className="dhikr-text !text-[1.9rem] font-bold text-ivory" lang="ar">
          {phrase.text}
        </span>
        <span className="mt-5" key={pulse}>
          <ProgressRing value={target ? shown / target : 0} size={200} stroke={10} label="تقدم الدورة">
            <span className="animate-pop block">
              <span className="block font-mono text-6xl font-bold tabular-nums text-ivory" dir="ltr">
                {toArabicDigits(shown)}
              </span>
              {target ? <span className="text-sm text-ivory/70">من {toArabicDigits(target)}</span> : null}
            </span>
          </ProgressRing>
        </span>
        <span className="mt-5 text-sm text-ivory/75">اضغط في أي مكان من البطاقة للعدّ</span>
      </button>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xl font-bold tabular-nums">{toArabicDigits(rounds)}</p>
          <p className="text-xs text-muted">دورات مكتملة</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xl font-bold tabular-nums">{toArabicDigits(total)}</p>
          <p className="text-xs text-muted">هذا الذكر اليوم</p>
        </div>
        <div className="rounded-2xl bg-surface-2 p-3">
          <p className="text-xl font-bold tabular-nums">{toArabicDigits(totalToday)}</p>
          <p className="text-xs text-muted">مجموع اليوم</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="radiogroup" aria-label="الهدف" className="inline-flex rounded-full bg-surface-2 p-1">
          {[...TASBIH_TARGETS, 0].map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={target === t}
              onClick={() => setDevice({ tasbihTarget: t })}
              className={cn("rounded-full px-4 py-1.5 text-sm font-semibold focus-ring", target === t ? "bg-surface text-fg shadow-sm" : "text-muted")}
            >
              {t ? toArabicDigits(t) : "مفتوح"}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setConfirm(true)} disabled={!total} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 disabled:opacity-40 focus-ring">
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          تصفير
        </button>
      </div>
      <p className="text-center text-xs text-muted">يُحفظ العدّ على جهازك تلقائيًا. يمكنك أيضًا الضغط على مفتاح المسافة للعدّ.</p>
      <ConfirmDialog
        open={confirm}
        title="تصفير العدّاد"
        message={`سيُصفَّر عدّاد «${phrase.text}» لهذا اليوم.`}
        confirmLabel="تصفير"
        onClose={() => setConfirm(false)}
        onConfirm={() => setTasbihCount(phrase.id, 0)}
      />
    </div>
  );
}
