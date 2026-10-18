import Link from "next/link";
import { BarChart, weekLabel } from "@/components/motivation/BarChart";
import { TaskForm } from "@/components/motivation/Forms";
import { TaskList, type PersonalTask } from "@/components/motivation/TaskList";
import { Card, cx } from "@/components/ui";
import type { createClient } from "@/lib/supabase/server";
import { evaluateBadges, type BadgeStats } from "@/lib/levels";
import { todayUtc } from "@/lib/time";

type Supa = Awaited<ReturnType<typeof createClient>>;
const DAY = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { weekday: "short", timeZone: "UTC" });

/** Points per day for the last 7 days (single series, brand green). */
export function WeekPointsChart({ days }: { days: Array<{ day: string; points: number }> }) {
  return (
    <BarChart
      title="نقاطي في آخر ٧ أيام"
      unit="نقطة"
      height={120}
      data={days.map((d) => {
        const name = DAY.format(new Date(`${d.day}T00:00:00Z`));
        return { key: d.day, label: name, value: d.points, tip: `${name}: ${d.points} نقطة` };
      })}
    />
  );
}

/** Earned badges and the three closest ones still to earn. */
export async function BadgesPreview({ supabase, studentId, longestStreak, href = "/dashboard/achievements" }: { supabase: Supa; studentId?: string; longestStreak: number; href?: string }) {
  const { data } = await supabase.rpc("get_my_badge_stats", studentId ? { p_student: studentId } : {});
  if (!data) return null;
  const badges = evaluateBadges({ ...(data as Omit<BadgeStats, "longest_streak">), longest_streak: longestStreak } as BadgeStats);
  const earned = badges.filter((b) => b.earned);
  const next = badges.filter((b) => !b.earned).sort((a, b) => b.progress - a.progress).slice(0, 3);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-brand-800">الإنجازات</h2>
        <Link href={href} className="text-sm font-semibold text-brand-800">{earned.length} من {badges.length} وسامًا ←</Link>
      </div>
      {earned.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="الأوسمة المكتسبة">
          {earned.map((b) => <li key={b.key} className="rounded-full bg-gold-50 px-2.5 py-1 text-sm" title={b.hint}><span aria-hidden>{b.icon}</span> {b.title}</li>)}
        </ul>
      )}
      <ul className="flex flex-col gap-2">
        {next.map((b) => (
          <li key={b.key} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-deep text-lg grayscale" aria-hidden>{b.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="flex justify-between gap-2 text-sm"><span className="font-semibold">{b.title}</span><span className="tabular-nums text-muted">{b.value} من {b.goal}</span></span>
              <span className="progress-track mt-1 block" role="progressbar" aria-valuenow={b.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`التقدّم نحو ${b.title}`}>
                <span className="progress-fill block" style={{ width: `${b.progress}%` }} />
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The user's own open tasks with a quick-add box (for every role). */
export async function TasksPreview({ supabase, userId, className }: { supabase: Supa; userId: string; className?: string }) {
  const { data } = await supabase.from("personal_tasks").select("id, title, due_on, priority, done_at").eq("user_id", userId).is("done_at", null)
    .order("priority").order("due_on", { ascending: true, nullsFirst: false }).limit(4);
  const tasks = (data ?? []) as PersonalTask[];
  return (
    <Card className={cx("flex flex-col", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold text-brand-800">مهامي</h2>
        <Link href="/dashboard/tasks" className="text-sm font-semibold text-brand-800">كل المهام ←</Link>
      </div>
      {tasks.length > 0 ? <TaskList tasks={tasks} today={todayUtc()} allowDelete={false} /> : <p className="mb-2 text-muted">لا مهام مفتوحة. أضف مهمة صغيرة لليوم.</p>}
      <div className="mt-2"><TaskForm compact /></div>
    </Card>
  );
}

/** Weekly halaqa charts for a teacher (one measure per chart). */
export async function HalaqaCharts({ supabase, halaqaId, name }: { supabase: Supa; halaqaId: string; name: string }) {
  const { data } = await supabase.rpc("get_halaqa_stats", { p_halaqa: halaqaId, p_weeks: 8 });
  const weeks = ((data as { weeks?: Array<{ week: string; attended: number; marked: number; new_ayat: number }> } | null)?.weeks ?? []);
  if (weeks.length === 0) return null;
  const pct = (a: number, m: number) => (m ? Math.round((a / m) * 100) : 0);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <BarChart title={`الحفظ الجديد أسبوعيًا — ${name}`} unit="آية" height={120}
          data={weeks.map((w) => ({ key: w.week, label: weekLabel(w.week), value: Number(w.new_ayat), tip: `أسبوع ${weekLabel(w.week)}: ${w.new_ayat} آية` }))} />
      </Card>
      <Card>
        <BarChart title="نسبة الحضور أسبوعيًا (%)" unit="%" height={120}
          data={weeks.map((w) => ({ key: w.week, label: weekLabel(w.week), value: pct(Number(w.attended), Number(w.marked)), tip: `أسبوع ${weekLabel(w.week)}: ${pct(Number(w.attended), Number(w.marked))}%` }))} />
      </Card>
    </div>
  );
}
