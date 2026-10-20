"use client";

import { BookText, Heart, Lightbulb, MessageCircleQuestion } from "lucide-react";
import { useEffect, useState } from "react";
import type { OasisMoment } from "@/content/types";
import { QuranPassage } from "@/components/quran/QuranPassage";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { markOasisSeen, saveJournal, toggleOasisFavorite } from "@/lib/store/actions";
import { getState, useHydrated, useStore } from "@/lib/store/store";

function Section({
  icon,
  label,
  note,
  tone,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  note?: string;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-2xl p-4", tone)}>
      <h3 className="mb-1.5 flex flex-wrap items-center gap-x-2 text-sm font-bold">
        {icon}
        {label}
        {note && <span className="text-xs font-semibold text-muted">— {note}</span>}
      </h3>
      <div className="text-[15px] leading-loose text-fg">{children}</div>
    </section>
  );
}

export function OasisMomentCard({
  moment,
  day,
  journal = true,
  markSeen = true,
}: {
  moment: OasisMoment;
  day: string;
  journal?: boolean;
  markSeen?: boolean;
}) {
  const hydrated = useHydrated();
  const toast = useToast();
  const fav = useStore((s) => {
    const f = s.oasisFavorites[moment.id];
    return !!f && !f.deleted;
  });
  const entryKey = `${day}:${moment.id}`;
  const [text, setText] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const e = getState().journal[entryKey];
    setText(e && !e.deleted ? e.text : "");
    setDirty(false);
    if (markSeen) markOasisSeen(day, moment.id);
  }, [hydrated, entryKey, day, moment.id, markSeen]);

  return (
    <article className="space-y-4" aria-label="لحظة واحة">
      <div className="rounded-[var(--radius-card)] border border-line bg-surface p-5 pattern-bg sm:p-7">
        <p className="mb-3 text-xs font-bold text-accent">النص القرآني</p>
        <QuranPassage refs={[{ surah: moment.surah, from: moment.ayahFrom, to: moment.ayahTo }]} size="large" />
      </div>

      {moment.meaning && (
        <Section
          icon={<BookText className="h-4 w-4 text-gold-fg" aria-hidden="true" />}
          label="المعنى"
          note={moment.meaningSource ? `منقول من: ${moment.meaningSource}` : undefined}
          tone="bg-gold-soft"
        >
          {moment.meaning}
        </Section>
      )}

      {moment.reflection && (
        <Section
          icon={<MessageCircleQuestion className="h-4 w-4 text-accent" aria-hidden="true" />}
          label="سؤال للتفكّر"
          note="تأمل تحريري من فريق واحة القرآن، وليس تفسيرًا"
          tone="bg-accent-soft"
        >
          {moment.reflection}
        </Section>
      )}

      {moment.action && (
        <Section icon={<Lightbulb className="h-4 w-4 text-accent" aria-hidden="true" />} label="خطوة عملية" tone="bg-surface-2">
          {moment.action}
        </Section>
      )}

      <div className="flex justify-end">
    <button
      type="button"
      onClick={() => {
        toggleOasisFavorite(moment.id);
        toast(fav ? "أُزيلت من المفضلة" : "حُفظت اللحظة في المفضلة");
      }}
      aria-pressed={fav}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold focus-ring",
        fav ? "bg-danger/10 text-danger" : "bg-surface-2 text-fg",
      )}
    >
      <Heart className={cn("h-4 w-4", fav && "fill-current")} aria-hidden="true" />
      {fav ? "في المفضلة" : "حفظ اللحظة"}
    </button>
      </div>

      {journal && (
        <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby={`j-${moment.id}`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 id={`j-${moment.id}`} className="text-sm font-bold">
              خاطرتي
            </h3>
            <span className="text-xs text-muted">خاصة بك وحدك</span>
          </div>
          <Textarea
            aria-labelledby={`j-${moment.id}`}
            value={text}
            maxLength={5000}
            onChange={(e) => {
              setText(e.target.value);
              setDirty(true);
            }}
            placeholder="ما الذي استوقفك في هذه الآية؟ (اختياري)"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              disabled={!dirty}
              onClick={() => {
                saveJournal(moment.id, day, text);
                setDirty(false);
                toast(text.trim() ? "حُفظت خاطرتك" : "حُذفت الخاطرة");
              }}
              className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-fg disabled:opacity-50 focus-ring"
            >
              حفظ الخاطرة
            </button>
          </div>
        </section>
      )}
    </article>
  );
}
