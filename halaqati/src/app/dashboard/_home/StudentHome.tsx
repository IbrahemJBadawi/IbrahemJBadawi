import Link from "next/link";
import { JoinMeetingButton } from "@/components/JoinMeetingButton";
import { Alert, ButtonLink, Card, EmptyState, Stat } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { studentMemberships } from "@/lib/data/halaqat";
import { formatDate, formatDateTime } from "@/lib/format";
import { ACTIVITY } from "@/lib/labels";
import { formatRange } from "@/lib/quran/surahs";
import { createClient } from "@/lib/supabase/server";
import { isoFromNow } from "@/lib/time";
import type { Assignment, Session, StudentOverview } from "@/lib/types";

export async function StudentHome({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const { rows: memberships } = await studentMemberships(supabase, user.id, ["active", "pending"]);
  const active = memberships.filter((m) => m.status === "active");
  const halaqaIds = active.map((m) => m.halaqa_id);

  const [overviewRes, assignmentRes, sessionRes] = await Promise.all([
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

  return (
    <div className="flex flex-col gap-5">

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-brand-600/30">
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

      {o && (
        <section aria-labelledby="progress-h">
          <h2 id="progress-h" className="mb-3 text-lg font-bold">تقدّمي (آخر {o.period_days} يومًا)</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="مجموع الحفظ المعتمد" value={`${o.amount.new_memorization_ayat} آية`} />
            <Stat label="المراجعة" value={`${o.amount.review_ayat_period} آية`} />
            <Stat label="متوسط الإتقان" value={o.mastery_avg ? `${o.mastery_avg} / 5` : "—"} />
            <Stat label="متوسط جودة التلاوة" value={o.recitation_avg ? `${o.recitation_avg} / 5` : "—"} />
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
