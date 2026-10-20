"use client";

import { ArrowRight, Check, Clock, Target } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { LearningPath } from "@/content/learning";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/Progress";
import { EmptyState } from "@/components/ui/States";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { toArabicDigits } from "@/lib/quran";
import { setLessonComplete } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store/store";

const TONES = { olive: "bg-accent-soft text-accent", gold: "bg-gold-soft text-gold-fg", deep: "bg-deep text-ivory" };

function useLessonDone() {
  const lessons = useStore((s) => s.lessons);
  const hydrated = useHydrated();
  return (pathId: string, lessonId: string) => {
    const l = lessons[`${pathId}/${lessonId}`];
    return hydrated && !!l && !l.deleted;
  };
}

export function PathsList({ paths }: { paths: LearningPath[] }) {
  const isDone = useLessonDone();
  if (!paths.length) return <EmptyState title="لا توجد مسارات منشورة حاليًا" />;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {paths.map((p) => {
        const done = p.lessons.filter((l) => isDone(p.id, l.id)).length;
        return (
          <li key={p.id}>
            <Link href={`/learn/${p.id}`} className="flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-6 hover:border-accent focus-ring">
              <span className="flex items-center justify-between">
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold", TONES[p.color])}>{p.level}</span>
                <span className="text-xs text-muted">{toArabicDigits(p.lessons.length)} دروس</span>
              </span>
              <span className="mt-4 text-xl font-bold">{p.title}</span>
              <span className="mt-1 flex-1 text-sm text-muted">{p.description}</span>
              <span className="mt-5 flex items-center gap-3">
                <ProgressBar value={p.lessons.length ? done / p.lessons.length : 0} label={`تقدمك في ${p.title}`} />
                <span className="shrink-0 text-xs font-semibold text-muted">
                  {toArabicDigits(done)}/{toArabicDigits(p.lessons.length)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function PathDetail({ path }: { path: LearningPath }) {
  const isDone = useLessonDone();
  const done = path.lessons.filter((l) => isDone(path.id, l.id)).length;
  const nextLesson = path.lessons.find((l) => !isDone(path.id, l.id)) ?? path.lessons[0];
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/learn" className="mb-4 inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        المسارات
      </Link>
      <header className="mb-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 pattern-bg">
        <Badge tone="accent">{path.level}</Badge>
        <h1 className="mt-3 text-2xl font-bold md:text-3xl">{path.title}</h1>
        <p className="mt-2 text-muted">{path.description}</p>
        {path.goals.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-bold">
              <Target className="h-4 w-4 text-accent" aria-hidden="true" />
              أهداف المسار
            </p>
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
              {path.goals.map((g) => (
                <li key={g} className="flex items-start gap-2">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden="true" />
                  {g}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-5 flex items-center gap-3">
          <ProgressBar value={path.lessons.length ? done / path.lessons.length : 0} label="تقدم المسار" />
          <span className="shrink-0 text-sm font-semibold">
            {toArabicDigits(done)}/{toArabicDigits(path.lessons.length)}
          </span>
        </div>
        {nextLesson && (
          <ButtonLink href={`/learn/${path.id}/${nextLesson.id}`} className="mt-5">
            {done ? "تابع المسار" : "ابدأ المسار"}
          </ButtonLink>
        )}
      </header>
      <ol className="relative mx-auto max-w-sm overflow-x-clip py-2" aria-label="مسار الدروس">
        {path.lessons.map((l, i) => {
          const complete = isDone(path.id, l.id);
          const current = !complete && nextLesson?.id === l.id;
          // تعرّج المسار: يمين، وسط، يسار، وسط…
          const offset = [0, -1, 0, 1][i % 4] * 64;
          return (
            <li key={l.id} className="relative flex flex-col items-center pb-8 last:pb-0">
              {i > 0 && (
                <span aria-hidden="true" className="mb-3 flex flex-col items-center gap-1.5" style={{ transform: `translateX(${([0, -1, 0, 1][i % 4] + [0, -1, 0, 1][(i - 1) % 4]) * 32}px)` }}>
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-line" />
                  <span className="h-2 w-2 rounded-full bg-line" />
                </span>
              )}
              <Link
                href={`/learn/${path.id}/${l.id}`}
                className="group relative flex flex-col items-center text-center focus-ring rounded-3xl"
                style={{ transform: `translateX(${offset}px)` }}
                aria-label={`الدرس ${i + 1}: ${l.title}${complete ? " — مكتمل" : current ? " — التالي" : ""}`}
              >
                <span className="relative">
                  {current && <span className="absolute inset-0 animate-ping rounded-[1.6rem] bg-primary/20" aria-hidden="true" />}
                  <span
                    className={cn(
                      "card-soft relative grid h-20 w-20 rotate-45 place-items-center rounded-[1.6rem] border-4 transition-transform group-hover:scale-105",
                      complete ? "border-[#5d8a54] bg-[#7da672]" : current ? "border-primary bg-accent" : "border-line bg-surface-2",
                    )}
                  >
                    <span className="-rotate-45">
                      {complete ? (
                        <Check className="h-8 w-8 text-white" aria-hidden="true" />
                      ) : (
                        <span className={cn("text-2xl font-bold", current ? "text-white" : "text-muted")}>{toArabicDigits(i + 1)}</span>
                      )}
                    </span>
                  </span>
                  {complete && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-sm text-gold" aria-hidden="true">
                      ★★★
                    </span>
                  )}
                </span>
                <span className={cn("mt-4 max-w-[11rem] font-bold leading-snug", current ? "text-primary" : "text-fg")}>{l.title}</span>
                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  {toArabicDigits(l.minutes)} دقائق
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-col items-center pt-6" aria-label="نهاية المسار">
          <span className={cn("grid h-16 w-16 place-items-center rounded-full text-2xl", done === path.lessons.length ? "bg-gold-soft" : "bg-surface-2 grayscale")} aria-hidden="true">
            🏅
          </span>
          <span className="mt-2 text-sm font-semibold text-muted">{done === path.lessons.length ? "أتممتَ المسار" : "إتمام المسار"}</span>
        </li>
      </ol>
    </div>
  );
}

export function LessonView({ path, index, children }: { path: LearningPath; index: number; children: ReactNode }) {
  const toast = useToast();
  const isDone = useLessonDone();
  const lesson = path.lessons[index];
  const next = path.lessons[index + 1];
  const prev = path.lessons[index - 1];
  const complete = isDone(path.id, lesson.id);
  return (
    <article className="mx-auto max-w-2xl">
      <Link href={`/learn/${path.id}`} className="mb-4 inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring">
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
        {path.title}
      </Link>
      <header className="mb-6">
        <p className="text-sm font-semibold text-accent">
          الدرس {toArabicDigits(index + 1)} من {toArabicDigits(path.lessons.length)} — مدته {toArabicDigits(lesson.minutes)} دقائق
        </p>
        <h1 className="mt-1 text-2xl font-bold md:text-3xl">{lesson.title}</h1>
        <p className="mt-1 text-muted">{lesson.summary}</p>
      </header>
      <Card className="p-6">{children}</Card>
      {lesson.sources.length > 0 && (
        <div className="mt-4 rounded-2xl bg-surface-2 p-4 text-sm">
          <p className="mb-1 font-bold">المراجع</p>
          <ul className="list-disc space-y-0.5 pr-5 text-muted">
            {lesson.sources.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant={complete ? "secondary" : "primary"}
          onClick={() => {
            setLessonComplete(`${path.id}/${lesson.id}`, !complete);
            toast(complete ? "أُلغي إكمال الدرس" : "أحسنت! أكملت الدرس");
          }}
          aria-pressed={complete}
        >
          <Check className="h-5 w-5" aria-hidden="true" />
          {complete ? "مكتمل — إلغاء" : "أكملت الدرس"}
        </Button>
        <div className="flex gap-2">
          {prev && (
            <ButtonLink href={`/learn/${path.id}/${prev.id}`} variant="ghost" size="sm">
              السابق
            </ButtonLink>
          )}
          {next ? (
            <ButtonLink href={`/learn/${path.id}/${next.id}`} variant="outline" size="sm">
              الدرس التالي
            </ButtonLink>
          ) : (
            <ButtonLink href="/learn" variant="outline" size="sm">
              كل المسارات
            </ButtonLink>
          )}
        </div>
      </div>
    </article>
  );
}
