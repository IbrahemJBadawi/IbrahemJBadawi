import Link from "next/link";
import { Icon } from "@/components/Icon";
import { JoinMeetingButton } from "@/components/JoinMeetingButton";
import { WirdForm } from "@/components/motivation/Forms";
import { LeagueTable } from "@/components/motivation/LeagueTable";
import { WeekStrip } from "@/components/motivation/WeekStrip";
import { BadgesPreview, TasksPreview, WeekPointsChart } from "@/components/motivation/HomeWidgets";
import { LevelCard } from "@/components/motivation/LevelCard";
import { Alert, ButtonLink, Card, EmptyState, Stat } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { studentMemberships } from "@/lib/data/halaqat";
import { formatDate, formatDateTime } from "@/lib/format";
import { ACTIVITY } from "@/lib/labels";
import { formatRange } from "@/lib/quran/surahs";
import { createClient } from "@/lib/supabase/server";
import { getMotivation, type LeagueRow } from "@/lib/data/motivation";
import { isoFromNow } from "@/lib/time";
import type { Assignment, Session, StudentOverview } from "@/lib/types";

export async function StudentHome({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const { rows: memberships } = await studentMemberships(supabase, user.id, ["active", "pending"]);
  const active = memberships.filter((m) => m.status === "active");
  const halaqaIds = active.map((m) => m.halaqa_id);

  const [msgRes, motivation, leagueRes, overviewRes, assignmentRes, sessionRes] = await Promise.all([
    halaqaIds.length ? supabase.rpc("get_halaqa_messages", { p_halaqa: halaqaIds[0], p_limit: 30 }) : Promise.resolve({ data: [] }),
    getMotivation(supabase),
    halaqaIds.length ? supabase.rpc("get_halaqa_league", { p_halaqa: halaqaIds[0], p_period: "week" }) : Promise.resolve({ data: [] as LeagueRow[] }),
    supabase.rpc("get_student_overview", { p_student: user.id, p_days: 30 }),
    supabase
      .from("quran_assignments")
      .select("*")
      .eq("student_id", user.id)
      .eq("status", "assigned")
      .order("due_on", { ascending: true, nullsFirst: false })
      .limit(1),
    halaqaIds.length
      ? supabase
          .from("quran_sessions")
          .select("*")
          .in("halaqa_id", halaqaIds)
          .eq("status", "scheduled")
          .gte("starts_at", isoFromNow(-3 * 3600e3))
          .order("starts_at")
          .limit(1)
      : Promise.resolve({ data: [] as Session[] }),
  ]);
  const o = overviewRes.data as StudentOverview | null;
  const task = (assignmentRes.data?.[0] ?? null) as Assignment | null;
  const next = (sessionRes.data?.[0] ?? null) as Session | null;
  const nextHalaqa = next ? active.find((m) => m.halaqa_id === next.halaqa_id)?.halaqat : null;
  const league = (leagueRes.data ?? []) as LeagueRow[];
  const m = motivation;
  const announcement = ((msgRes.data ?? []) as Array<{ id: string; body: string; author_name: string; is_announcement: boolean; pinned: boolean; created_at: string }>)
    .find((x) => x.is_announcement || x.pinned);

  return (
    <div className="flex flex-col gap-5">
      {m && (
        <section aria-label="الحماسة والنقاط" className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-14 place-items-center rounded-[20px] bg-gold-50 text-3xl" aria-hidden>🔥</span>
                <div>
                  <p className="text-sm text-muted">الحماسة</p>
                  <p className="text-2xl font-bold tabular-nums">{m.current_streak} <span className="text-base font-semibold">{m.current_streak === 1 ? "يوم" : "أيام"} متتالية</span></p>
                  <p className="text-xs text-muted">{m.active_today ? "أحسنت، حافظت على حماستك اليوم" : m.current_streak > 0 ? "سجّل نشاطًا اليوم كي لا تنقطع السلسلة" : "ابدأ سلسلتك اليوم بورد أو مهمة"} · أطول سلسلة {m.longest_streak}</p>
                </div>
              </div>
            </div>
            <WeekStrip days={m.last7} />
            <div className="border-t border-line pt-3"><WirdForm today={m.wird_today} /></div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Card className="col-span-2"><LevelCard points={m.points_total} compact /></Card>
            <Stat label="نقاط هذا الأسبوع" value={m.points_week} />
            <Stat label="مجموع النقاط" value={m.points_total} />
            <Card className="col-span-2 text-sm text-muted">
              <p className="mb-1 font-semibold text-ink">كيف أجمع النقاط؟</p>
              حفظ جديد معتمد 10 · مراجعة 6 · حضور 5 (متأخر 3) · ورد يومي 3 · مهمة منجزة 2
              <span className="mt-1 flex flex-wrap gap-x-4">
                <Link href="/dashboard/achievements" className="font-semibold text-brand-800">إنجازاتي ←</Link>
                <Link href="/dashboard/stats" className="font-semibold text-brand-800">إحصائياتي ←</Link>
              </span>
            </Card>
          </div>
        </section>
      )}

      {m && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card><WeekPointsChart days={m.last7} /></Card>
          <Card><BadgesPreview supabase={supabase} longestStreak={m.longest_streak} /></Card>
        </div>
      )}

      {announcement && (
        <Link href={`/dashboard/messages?h=${halaqaIds[0]}`} className="surface flex items-start gap-3 border-brand-600/30 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-brand-100 text-brand-800"><Icon name="megaphone" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-muted">إعلان من {announcement.author_name} · {formatDateTime(announcement.created_at)}</span>
            <span className="line-clamp-2 block">{announcement.body}</span>
          </span>
        </Link>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">مهمة اليوم</h2>
          {task ? (
            <>
              <p className="text-lg font-semibold">{ACTIVITY[task.activity]}: {formatRange(task)}</p>
              <p className="text-sm text-muted">{task.ayah_count} آية{task.due_on ? ` · الموعد ${formatDate(task.due_on)}` : ""}</p>
              {task.instructions && <p className="mt-2 text-muted">{task.instructions}</p>}
            </>
          ) : (
            <p className="text-muted">لا يوجد واجب مطلوب حاليًا.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">الجلسة القادمة</h2>
          {next ? (
            <>
              <p className="text-lg font-semibold">{nextHalaqa?.name}</p>
              <p className="text-muted">{formatDateTime(next.starts_at, nextHalaqa?.timezone)}</p>
              <JoinMeetingButton url={next.meeting_url} startsAt={next.starts_at} durationMinutes={next.duration_minutes} />
            </>
          ) : (
            <p className="text-muted">لا توجد جلسات مجدولة.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TasksPreview supabase={supabase} userId={user.id} />
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-bold text-brand-800"><Icon name="trophy" />الدوري هذا الأسبوع</h2>
            <Link href="/dashboard/league" className="text-sm font-semibold text-brand-800">الترتيب الكامل ←</Link>
          </div>
          {league.length > 0 ? (
            <>
              <p className="mb-2 text-sm text-muted">{active[0]?.halaqat?.name}</p>
              <LeagueTable rows={league} limit={3} />
            </>
          ) : (
            <p className="text-muted">{halaqaIds.length ? "الدوري متوقف في حلقتك حاليًا." : "انضم إلى حلقة لتشارك في دوريها."}</p>
          )}
        </Card>
      </div>

      {o && (
        <section aria-labelledby="progress-h">
          <h2 id="progress-h" className="mb-3 text-lg font-bold">تقدّمي (آخر {o.period_days} يومًا)</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="مجموع الحفظ المعتمد" value={`${o.amount.new_memorization_ayat} آية`} />
            <Stat label="المراجعة" value={`${o.amount.review_ayat_period} آية`} />
            <Stat label="متوسط الإتقان" value={o.mastery_avg ? `${o.mastery_avg} من 5` : "—"} />
            <Stat label="متوسط جودة التلاوة" value={o.recitation_avg ? `${o.recitation_avg} من 5` : "—"} />
          </div>
          <Link href="/dashboard/journey" className="mt-3 inline-block font-semibold text-brand-800 underline">تفاصيل رحلتي القرآنية</Link>
        </section>
      )}

      {memberships.length === 0 ? (
        <EmptyState title="لم تنضم إلى أي حلقة بعد">
          <ButtonLink href="/halaqat" className="mt-3">ابحث عن حلقة</ButtonLink>
        </EmptyState>
      ) : memberships.some((m) => m.status === "pending") ? (
        <Alert tone="info">لديك طلبات انضمام قيد المراجعة. <Link href="/dashboard/halaqat" className="font-semibold underline">عرض حلقاتي</Link></Alert>
      ) : null}
    </div>
  );
}
