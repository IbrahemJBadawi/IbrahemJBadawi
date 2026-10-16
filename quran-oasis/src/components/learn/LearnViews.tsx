"use client";

import { ArrowRight, Check, ChevronLeft, Clock, Target } from "lucide-react";
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
      <ol className="space-y-3">
        {path.lessons.map((l, i) => {
          const complete = isDone(path.id, l.id);
          return (
            <li key={l.id}>
              <Link href={`/learn/${path.id}/${l.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:border-accent focus-ring">
                <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold", complete ? "bg-success text-white" : "bg-surface-2")}>
                  {complete ? <Check className="h-5 w-5" aria-label="مكتمل" /> : toArabicDigits(i + 1)}
                </span>
                <span className="flex-1">
                  <span className="block font-bold">{l.title}</span>
                  <span className="block text-sm text-muted">{l.summary}</span>
                </span>
                <span className="hidden items-center gap-1 text-xs text-muted sm:flex">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {toArabicDigits(l.minutes)} د
                </span>
                <ChevronLeft className="h-5 w-5 text-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
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
