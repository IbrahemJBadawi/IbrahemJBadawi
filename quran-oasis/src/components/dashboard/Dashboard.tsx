"use client";

import { BookOpen, CalendarCheck, ChevronLeft, CloudUpload, Leaf, Pencil, Sparkles, Target, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Dhikr, DhikrCategory } from "@/content/adhkar";
import type { OasisMoment } from "@/content/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { CATEGORY_ICONS } from "@/components/adhkar/icons";
import { QuranPassage } from "@/components/quran/QuranPassage";
import { TaskList, useActiveTasks } from "@/components/plan/TaskList";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { dayKey, formatGregorian, formatHijri, partOfDay } from "@/lib/date";
import { pickMomentForDay } from "@/lib/oasis";
import { formatCitation, getSurahMeta, toArabicDigits } from "@/lib/quran";
import { addTask } from "@/lib/store/actions";
import { activeKhatma, adhkarStatus, formatAmount, goalProgress, khatmaProgress, readingStreak } from "@/lib/store/progress";
import { useHydrated, useStore } from "@/lib/store/store";
import { dismissImportNotice, useSyncInfo } from "@/lib/store/sync";
import { TASK_CATALOG } from "@/lib/tasks";
import { GoalDialog } from "./GoalDialog";

const GREETING = { morning: "صباح الخير", afternoon: "طاب يومك", evening: "مساء الخير", night: "طابت ليلتك" };

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-2", className)} />;
}

export function Dashboard({ adhkar, categories, moments }: { adhkar: Dhikr[]; categories: DhikrCategory[]; moments: OasisMoment[] }) {
  const hydrated = useHydrated();
  const { user, profile, enabled } = useAuth();
  const sync = useSyncInfo();
  const today = dayKey();
  const lastRead = useStore((s) => s.lastRead);
  const readingLog = useStore((s) => s.readingLog);
  const settings = useStore((s) => s.settings);
  const khatmas = useStore((s) => s.khatmas);
  const adhkarLog = useStore((s) => s.adhkarLog);
  const [goalOpen, setGoalOpen] = useState(false);
  const tasks = useActiveTasks();

  const goal = useMemo(() => goalProgress({ readingLog, settings }, today), [readingLog, settings, today]);
  const streak = useMemo(() => readingStreak({ readingLog }, today), [readingLog, today]);
  const khatma = useMemo(() => activeKhatma({ khatmas }), [khatmas]);
  const kp = useMemo(() => (khatma ? khatmaProgress(khatma, { readingLog }, today) : null), [khatma, readingLog, today]);
  const moment = useMemo(() => (hydrated ? pickMomentForDay(moments, today) : null), [hydrated, moments, today]);
  const hijri = hydrated ? formatHijri() : null;
  const name = profile?.display_name || (user?.user_metadata?.display_name as string | undefined);
  const lastMeta = lastRead ? getSurahMeta(lastRead.surah) : null;
  const tracked = settings.trackedAdhkar.length ? settings.trackedAdhkar : ["morning", "evening"];

  return (
    <div className="space-y-5">
      {/* ───────── الترحيب ───────── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="min-h-6 text-sm text-muted">
            {hydrated && formatGregorian()}
            {hijri && (
              <>
                {" · "}
                <span title="بحسب تقويم أم القرى">{hijri}</span>
              </>
            )}
          </p>
          <h1 className="mt-1 text-2xl font-bold md:text-3xl">
            {hydrated ? GREETING[partOfDay()] : "أهلًا بك"}
            {name ? `، ${name}` : ""}
          </h1>
        </div>
        {hydrated && streak > 1 && <Badge tone="gold">{toArabicDigits(streak)} أيام متتالية مع القرآن</Badge>}
      </header>

      {sync.importedGuestData && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-2xl bg-accent-soft p-4 text-sm">
          <p>
            <CloudUpload className="ml-1 inline h-4 w-4 text-accent" aria-hidden="true" />
            نقلنا تقدّمك المحفوظ على هذا الجهاز إلى حسابك، وسيُزامن الآن بين أجهزتك.
          </p>
          <button type="button" onClick={dismissImportNotice} aria-label="إخفاء" className="rounded-full p-1 hover:bg-surface focus-ring">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ───────── متابعة القرآن ───────── */}
        <Card className="lg:col-span-2">
          <CardTitle icon={<BookOpen className="h-5 w-5" />}>وردي من القرآن</CardTitle>
          {!hydrated ? (
            <Skeleton className="h-28" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                {lastMeta && lastRead ? (
                  <>
                    <p className="text-sm text-muted">آخر موضع وصلت إليه</p>
                    <p className="text-xl font-bold">
                      سورة {lastMeta.name} · الآية {toArabicDigits(lastRead.ayah)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold">ابدأ وردك الأول</p>
                    <p className="text-sm text-muted">سنحفظ موضعك تلقائيًا أثناء القراءة.</p>
                  </>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href={lastRead ? `/quran/${lastRead.surah}?ayah=${lastRead.ayah}` : "/quran/1"}>
                    <BookOpen className="h-5 w-5" aria-hidden="true" />
                    {lastRead ? "متابعة القراءة" : "ابدأ من الفاتحة"}
                  </ButtonLink>
                  <ButtonLink href="/quran" variant="outline">
                    فهرس السور
                  </ButtonLink>
                </div>
              </div>
              <div className="flex items-center gap-5 sm:flex-col sm:items-end">
                {goal.enabled ? (
                  <div className="flex items-center gap-3">
                    <ProgressRing value={goal.ratio} label="تقدم الهدف اليومي" size={84}>
                      <span className="text-sm font-bold leading-none">
                        {formatAmount(goal.done)}
                        <span className="block text-[10px] font-semibold text-muted">من {goal.target}</span>
                      </span>
                    </ProgressRing>
                    <div className="text-sm">
                      <p className="font-bold">{goal.reached ? "بلغتَ هدفك اليوم" : "هدف اليوم"}</p>
                      <p className="text-muted">
                        {goal.target} {goal.unit === "pages" ? "صفحة" : "آية"}
                      </p>
                      <button type="button" onClick={() => setGoalOpen(true)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent focus-ring rounded">
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        تغيير الهدف
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setGoalOpen(true)}>
                    <Target className="h-4 w-4" aria-hidden="true" />
                    حدد هدفًا يوميًا
                  </Button>
                )}
              </div>
            </div>
          )}

          {hydrated && kp && khatma && (
            <div className="mt-5 rounded-2xl bg-surface-2 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <p className="font-bold">{khatma.title}</p>
                <p className="font-semibold tabular-nums">{formatAmount(Math.floor(kp.percent * 10) / 10)}٪</p>
              </div>
              <ProgressBar value={kp.percent / 100} label="تقدم الختمة" />
              <p className="mt-2 text-xs text-muted">
                {kp.complete
                  ? "أتممتَ الختمة، تقبّل الله منك"
                  : `قرأت ${formatAmount(kp.pagesRead)} صفحة من ٦٠٤ · المقترح اليوم ${formatAmount(Math.max(0, kp.dailyPages - kp.readToday))} صفحة · متبقٍ ${toArabicDigits(kp.daysLeft)} يومًا`}
              </p>
            </div>
          )}
          {hydrated && !khatma && (
            <Link href="/plan" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent focus-ring rounded">
              تريد خطة ختمة؟ أنشئها بالمدة التي تناسبك
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          )}
        </Card>

        {/* ───────── الأذكار ───────── */}
        <Card>
          <CardTitle
            icon={<Sparkles className="h-5 w-5" />}
            action={
              <Link href="/adhkar" className="text-sm font-semibold text-accent focus-ring rounded">
                كل الأذكار
              </Link>
            }
          >
            أذكار اليوم
          </CardTitle>
          <ul className="space-y-2">
            {categories
              .filter((c) => tracked.includes(c.id as never))
              .map((c) => {
                const st = adhkarStatus(adhkar, { adhkarLog }, c.id, today);
                const Icon = CATEGORY_ICONS[c.icon] ?? CATEGORY_ICONS.hands;
                return (
                  <li key={c.id}>
                    <Link href={`/adhkar/${c.id}`} className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3 hover:bg-accent-soft focus-ring">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface text-accent">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold">{c.title}</span>
                        <span className="block text-xs text-muted">
                          {!hydrated ? "…" : st.complete ? "✓ أُنجزت" : st.done ? `${st.done} من ${st.total}` : "لم تبدأ بعد"}
                        </span>
                      </span>
                      <ChevronLeft className="h-4 w-4 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
          </ul>
        </Card>

        {/* ───────── لحظة واحة ───────── */}
        <Card className="lg:col-span-2">
          <CardTitle
            icon={<Leaf className="h-5 w-5" />}
            action={
              <Link href="/oasis" className="text-sm font-semibold text-accent focus-ring rounded">
                افتح اللحظة
              </Link>
            }
          >
            لحظة واحة
          </CardTitle>
          {!hydrated ? (
            <Skeleton className="h-24" />
          ) : moment ? (
            <div className="space-y-3">
              <QuranPassage refs={[{ surah: moment.surah, from: moment.ayahFrom, to: moment.ayahTo }]} showCitation={false} />
              <p className="text-xs font-semibold text-muted">
                سورة {getSurahMeta(moment.surah)?.name} {formatCitation(moment.surah, moment.ayahFrom, moment.ayahTo)}
              </p>
              {moment.reflection && (
                <p className="rounded-2xl bg-accent-soft p-3 text-[15px]">
                  <span className="block text-xs font-bold text-muted">سؤال للتفكّر (تأمل تحريري)</span>
                  {moment.reflection}
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted">لا توجد لحظة منشورة لهذا اليوم.</p>
          )}
        </Card>

        {/* ───────── خطة اليوم ───────── */}
        <Card>
          <CardTitle
            icon={<CalendarCheck className="h-5 w-5" />}
            action={
              <Link href="/plan" className="text-sm font-semibold text-accent focus-ring rounded">
                تعديل
              </Link>
            }
          >
            خطة اليوم
          </CardTitle>
          {!hydrated ? (
            <Skeleton className="h-32" />
          ) : tasks.length ? (
            <TaskList adhkar={adhkar} />
          ) : (
            <div>
              <p className="text-sm text-muted">اختر ما تريد متابعته يوميًا. ابدأ بالقليل الدائم.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {TASK_CATALOG.filter((t) => t.recommended).map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => addTask(t.type, t.title)}
                    className="h-9 rounded-full border border-line bg-surface px-3 text-sm font-semibold hover:border-accent focus-ring"
                  >
                    + {t.title}
                  </button>
                ))}
              </div>
              <Link href="/plan" className="mt-3 inline-block text-sm font-semibold text-accent focus-ring rounded">
                خيارات أخرى
              </Link>
            </div>
          )}
        </Card>
      </div>

      {enabled && !user && hydrated && (
        <Card className="flex flex-wrap items-center justify-between gap-3 bg-gold-soft border-transparent">
          <p className="text-sm">
            <span className="font-bold">تقدمك محفوظ على هذا الجهاز فقط.</span> أنشئ حسابًا مجانيًا لمزامنته بين أجهزتك وعدم فقدانه.
          </p>
          <ButtonLink href="/signup" variant="primary" size="sm">
            إنشاء حساب
          </ButtonLink>
        </Card>
      )}
      <GoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} />
    </div>
  );
}
