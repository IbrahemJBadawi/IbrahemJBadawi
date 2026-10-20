"use client";

import {
  BookMarked,
  BookOpen,
  CalendarCheck,
  ChevronLeft,
  CircleDot,
  Clock,
  CloudUpload,
  Compass,
  Flame,
  GraduationCap,
  Leaf,
  Pencil,
  Sparkles,
  Target,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Dhikr, DhikrCategory } from "@/content/adhkar";
import type { OasisMoment } from "@/content/types";
import { useAuth } from "@/components/auth/AuthProvider";
import { CATEGORY_ICONS } from "@/components/adhkar/icons";
import { PrayerHero } from "@/components/prayer/PrayerHero";
import { QuranPassage } from "@/components/quran/QuranPassage";
import { TaskList, useActiveTasks } from "@/components/plan/TaskList";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar, ProgressRing } from "@/components/ui/Progress";
import { cn } from "@/components/ui/cn";
import { addDays, dayKey, parseDayKey, partOfDay } from "@/lib/date";
import { getDevice, setDevice } from "@/lib/device";
import { pickMomentForDay } from "@/lib/oasis";
import { formatCitation, getSurahMeta, toArabicDigits } from "@/lib/quran";
import { addTask } from "@/lib/store/actions";
import { activeKhatma, adhkarStatus, formatAmount, goalProgress, khatmaProgress, readingStreak } from "@/lib/store/progress";
import { getState, useHydrated, useStore } from "@/lib/store/store";
import { dismissImportNotice, useSyncInfo } from "@/lib/store/sync";
import { TASK_CATALOG } from "@/lib/tasks";
import { GoalDialog } from "./GoalDialog";

const GREETING = { morning: "صباح الخير", afternoon: "طاب يومك", evening: "مساء الخير", night: "طابت ليلتك" };

const QUICK: { href: string; label: string; icon: LucideIcon; tint: string; fg: string }[] = [
  { href: "/quran", label: "المصحف", icon: BookOpen, tint: "bg-tint-sage", fg: "text-accent" },
  { href: "/adhkar", label: "الأذكار", icon: Sparkles, tint: "bg-tint-sand", fg: "text-gold-fg" },
  { href: "/prayer", label: "الصلاة", icon: Clock, tint: "bg-tint-sky", fg: "text-[#3e6b80] dark:text-[#9cc3d4]" },
  { href: "/qibla", label: "القبلة", icon: Compass, tint: "bg-tint-apricot", fg: "text-[#9a5b2c] dark:text-[#e2b38c]" },
  { href: "/tasbih", label: "المسبحة", icon: CircleDot, tint: "bg-tint-mint", fg: "text-success" },
  { href: "/oasis", label: "لحظة واحة", icon: Leaf, tint: "bg-tint-sage", fg: "text-accent" },
  { href: "/hifz", label: "الحفظ", icon: BookMarked, tint: "bg-tint-rose", fg: "text-[#9a4b4b] dark:text-[#e3a5a5]" },
  { href: "/learn", label: "التعلّم", icon: GraduationCap, tint: "bg-tint-sky", fg: "text-[#3e6b80] dark:text-[#9cc3d4]" },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-surface-2", className)} />;
}

function QuickAccess() {
  return (
    <nav aria-label="وصول سريع">
      <ul className="grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-8">
        {QUICK.map((q) => (
          <li key={q.href}>
            <Link href={q.href} className="group flex flex-col items-center gap-1.5 rounded-2xl p-1 text-center focus-ring">
              <span className={cn("card-soft grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:-translate-y-0.5", q.tint)}>
                <q.icon className={cn("h-6 w-6", q.fg)} aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-fg">{q.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function StreakCard({ today }: { today: string }) {
  const readingLog = useStore((s) => s.readingLog);
  const streak = useMemo(() => readingStreak({ readingLog }, today), [readingLog, today]);
  // أيام الأسبوع الحالي (من السبت)
  const start = addDays(today, -((parseDayKey(today).getDay() + 1) % 7));
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <Card className="card-soft border-transparent">
      <div className="flex items-center gap-4">
        <span className={cn("grid h-14 w-14 place-items-center rounded-2xl", streak ? "bg-tint-apricot" : "bg-surface-2")}>
          <Flame className={cn("h-7 w-7", streak ? "text-[#d9792b]" : "text-muted")} aria-hidden="true" />
        </span>
        <div>
          <p className="text-2xl font-bold">
            {toArabicDigits(streak)} <span className="text-base font-semibold text-muted">{streak === 1 ? "يوم" : "أيام"} متتالية</span>
          </p>
          <p className="text-sm text-muted">{streak ? "استمر بهدوء، القليل الدائم خير" : "ابدأ اليوم ولو بآية"}</p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-7 gap-1.5" aria-label="قراءة هذا الأسبوع">
        {days.map((d) => {
          const read = (readingLog[d]?.length ?? 0) > 0;
          const future = d > today;
          return (
            <li key={d} className="text-center">
              <span className="block text-[11px] text-muted">{new Intl.DateTimeFormat("ar", { weekday: "narrow" }).format(parseDayKey(d))}</span>
              <span
                className={cn(
                  "mx-auto mt-1 grid h-8 w-8 place-items-center rounded-full text-xs font-bold",
                  read ? "bg-[#f3c995] text-[#7a3f12] dark:bg-[#5a3a1d] dark:text-[#f3c995]" : future ? "bg-surface-2 text-muted/50" : "bg-surface-2 text-muted",
                  d === today && "ring-2 ring-gold",
                )}
                aria-label={`${d}: ${read ? "قرأت" : "لا قراءة"}`}
              >
                {read ? "✓" : toArabicDigits(parseDayKey(d).getDate())}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function Dashboard({ adhkar, categories, moments }: { adhkar: Dhikr[]; categories: DhikrCategory[]; moments: OasisMoment[] }) {
  const router = useRouter();
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

  // الإعداد الأولي للزائر الجديد فقط
  useEffect(() => {
    if (!hydrated || getDevice().onboarded) return;
    const s = getState();
    const fresh = !s.lastRead && !Object.keys(s.readingLog).length && !Object.keys(s.tasks).length;
    if (fresh) router.replace("/welcome");
    else setDevice({ onboarded: true });
  }, [hydrated, router]);

  const goal = useMemo(() => goalProgress({ readingLog, settings }, today), [readingLog, settings, today]);
  const khatma = useMemo(() => activeKhatma({ khatmas }), [khatmas]);
  const kp = useMemo(() => (khatma ? khatmaProgress(khatma, { readingLog }, today) : null), [khatma, readingLog, today]);
  const moment = useMemo(() => (hydrated ? pickMomentForDay(moments, today) : null), [hydrated, moments, today]);
  const name = profile?.display_name || (user?.user_metadata?.display_name as string | undefined);
  const lastMeta = lastRead ? getSurahMeta(lastRead.surah) : null;
  const tracked = settings.trackedAdhkar.length ? settings.trackedAdhkar : ["morning", "evening"];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-muted">السلام عليكم{name ? `، ${name}` : ""}</p>
        <h1 className="text-2xl font-bold md:text-3xl">{hydrated ? GREETING[partOfDay()] : "أهلًا بك"}</h1>
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

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <PrayerHero />
        <div className="hidden lg:block">
          <StreakCard today={today} />
        </div>
      </div>

      <QuickAccess />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ───────── متابعة القرآن ───────── */}
        <Card className="card-soft border-transparent lg:col-span-2">
          <CardTitle icon={<BookOpen className="h-5 w-5" />}>وردي من القرآن</CardTitle>
          {!hydrated ? (
            <Skeleton className="h-28" />
          ) : (
            <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
              <Link
                href={lastRead ? `/quran/${lastRead.surah}?ayah=${lastRead.ayah}` : "/quran/1"}
                className="hero-sunrise group relative overflow-hidden rounded-2xl p-4 focus-ring"
              >
                <p className="text-xs font-semibold text-gold-fg">{lastRead ? "آخر قراءة" : "ابدأ وردك الأول"}</p>
                <p className="mt-1 text-2xl font-bold text-fg">{lastMeta ? `سورة ${lastMeta.name}` : "سورة الفاتحة"}</p>
                {lastMeta && lastRead && (
                  <>
                    <p className="text-sm text-muted">
                      الآية {toArabicDigits(lastRead.ayah)} من {toArabicDigits(lastMeta.ayahs)}
                    </p>
                    <ProgressBar className="mt-2 h-1.5" value={lastRead.ayah / lastMeta.ayahs} label="موضعك في السورة" />
                  </>
                )}
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary">
                  {lastRead ? "متابعة القراءة" : "ابدأ القراءة"}
                  <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
                </span>
              </Link>
              <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                {goal.enabled ? (
                  <>
                    <ProgressRing value={goal.ratio} label="تقدم الهدف اليومي" size={92}>
                      <span className="text-base font-bold leading-none">
                        {formatAmount(goal.done)}
                        <span className="block text-[10px] font-semibold text-muted">من {goal.target}</span>
                      </span>
                    </ProgressRing>
                    <div className="text-sm sm:text-center">
                      <p className="font-bold">{goal.reached ? "بلغتَ هدفك اليوم ✓" : `هدف اليوم ${goal.target} ${goal.unit === "pages" ? "صفحة" : "آية"}`}</p>
                      <button type="button" onClick={() => setGoalOpen(true)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent focus-ring rounded">
                        <Pencil className="h-3 w-3" aria-hidden="true" />
                        تغيير الهدف
                      </button>
                    </div>
                  </>
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

        <div className="lg:hidden">{hydrated ? <StreakCard today={today} /> : <Skeleton className="h-40" />}</div>

        {/* ───────── الأذكار ───────── */}
        <Card className="card-soft border-transparent">
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
                      <span className={cn("grid h-11 w-11 place-items-center rounded-xl", c.id === "evening" ? "bg-tint-rose" : "bg-tint-sand")}>
                        <Icon className="h-5 w-5 text-gold-fg" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{c.title}</span>
                        <ProgressBar className="mt-1.5 h-1.5" value={hydrated && st.total ? st.done / st.total : 0} label={`تقدم ${c.title}`} />
                      </span>
                      <span className="text-xs font-semibold text-muted">{!hydrated ? "…" : st.complete ? "✓" : `${toArabicDigits(st.done)} من ${toArabicDigits(st.total)}`}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
          <Link href="/tasbih" className="mt-3 flex items-center justify-between rounded-2xl border border-dashed border-line px-3 py-2.5 text-sm font-semibold hover:bg-surface-2 focus-ring">
            <span className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-success" aria-hidden="true" />
              المسبحة
            </span>
            <ChevronLeft className="h-4 w-4 text-muted" aria-hidden="true" />
          </Link>
        </Card>

        {/* ───────── لحظة واحة ───────── */}
        <Card className="card-soft border-transparent pattern-bg lg:col-span-2">
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
        <Card className="card-soft border-transparent">
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
            </div>
          )}
        </Card>
      </div>

      {enabled && !user && hydrated && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-transparent bg-gold-soft">
          <p className="text-sm">
            <span className="font-bold">تقدمك محفوظ على هذا الجهاز.</span> أنشئ حسابًا مجانيًا لمزامنته بين أجهزتك.
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
