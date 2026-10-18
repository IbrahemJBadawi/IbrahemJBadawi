import { ExportBar } from "@/components/export/ExportBar";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OverviewStats } from "@/components/OverviewStats";
import { ProgressList, type RecordWithErrors } from "@/components/ProgressList";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { myChildren } from "@/lib/data/children";
import { personName } from "@/lib/data/halaqat";
import { formatDate, formatDateTime } from "@/lib/format";
import { ACTIVITY, ASSIGNMENT_STATUS, MEMBERSHIP_STATUS } from "@/lib/labels";
import { formatRange } from "@/lib/quran/surahs";
import { getMotivation, loadReactions } from "@/lib/data/motivation";
import { createClient } from "@/lib/supabase/server";
import { WeekStrip } from "@/components/motivation/WeekStrip";
import type { Assignment, Session, StudentOverview } from "@/lib/types";

export const metadata: Metadata = { title: "تقدّم الابن" };

export default async function ChildPage({ params }: PageProps<"/dashboard/children/[studentId]">) {
  const user = await requireContext("parent");
  const { studentId } = await params;
  const supabase = await createClient();
  const { rows } = await myChildren(supabase, user.id);
  const child = rows.find((c) => c.student_id === studentId);
  // Only linked children; the database enforces the same rule.
  if (!child) notFound();

  const [overviewRes, recordsRes, assignmentsRes, membershipsRes] = await Promise.all([
    supabase.rpc("get_student_overview", { p_student: studentId, p_days: 30 }),
    supabase
      .from("quran_progress_records")
      .select("*, quran_error_records(id, error_type, surah, ayah, note), halaqat(name)")
      .eq("student_id", studentId)
      .order("recorded_on", { ascending: false })
      .limit(15),
    supabase.from("quran_assignments").select("*").eq("student_id", studentId).eq("status", "assigned").order("due_on").limit(10),
    supabase
      .from("halaqa_memberships")
      .select("halaqa_id, status, halaqat(name, timezone)")
      .eq("user_id", studentId)
      .eq("role", "student")
      .in("status", ["pending", "active"]),
  ]);
  const memberships = (membershipsRes.data ?? []) as unknown as Array<{ halaqa_id: string; status: string; halaqat: { name: string; timezone: string } | null }>;
  const activeIds = memberships.filter((m) => m.status === "active").map((m) => m.halaqa_id);
  const { data: sessions } = activeIds.length
    ? await supabase.from("quran_sessions").select("*").in("halaqa_id", activeIds).eq("status", "scheduled").gte("starts_at", new Date().toISOString()).order("starts_at").limit(5)
    : { data: [] as Session[] };
  const o = overviewRes.data as StudentOverview | null;
  const records = (recordsRes.data ?? []) as RecordWithErrors[];
  const [reactions, motivation] = await Promise.all([
    loadReactions(supabase, "progress_record", records.map((r) => r.id), user.id),
    getMotivation(supabase, studentId),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={personName(child.profiles)} description={<Link href="/dashboard/children" className="underline">← الأبناء</Link>} />
      <ExportBar type="records" id={studentId} fileName={`تقدم-${personName(child.profiles)}`} />
      {motivation && (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <p className="text-lg font-bold"><span aria-hidden>🔥</span> الحماسة: {motivation.current_streak} {motivation.current_streak === 1 ? "يوم" : "أيام"}</p>
          <p className="text-muted">نقاط الأسبوع: <strong className="text-ink">{motivation.points_week}</strong> · المجموع: <strong className="text-ink">{motivation.points_total}</strong></p>
          <WeekStrip days={motivation.last7} />
          <Link href={`/dashboard/stats?s=${studentId}`} className="font-semibold text-brand-800">الإحصائيات ←</Link>
          <Link href={`/dashboard/achievements?s=${studentId}`} className="font-semibold text-brand-800">الإنجازات ←</Link>
        </Card>
      )}
      {o && <OverviewStats o={o} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">الحلقات</h2>
          {memberships.length === 0 ? <p className="text-muted">غير منضم لأي حلقة.</p> : (
            <ul className="divide-y divide-line">
              {memberships.map((m) => <li key={m.halaqa_id} className="flex justify-between py-2"><span>{m.halaqat?.name}</span><Badge>{MEMBERSHIP_STATUS[m.status]}</Badge></li>)}
            </ul>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold text-brand-800">الجدول القادم</h2>
          {(sessions ?? []).length === 0 ? <p className="text-muted">لا توجد جلسات مجدولة.</p> : (
            <ul className="divide-y divide-line">
              {(sessions as Session[]).map((s) => {
                const h = memberships.find((m) => m.halaqa_id === s.halaqa_id)?.halaqat;
                return <li key={s.id} className="py-2"><span className="font-semibold">{h?.name}</span> <span className="text-sm text-muted">{formatDateTime(s.starts_at, h?.timezone)}</span></li>;
              })}
            </ul>
          )}
        </Card>
      </div>
      <Card>
        <h2 className="mb-2 font-bold text-brand-800">الواجبات المطلوبة</h2>
        {(assignmentsRes.data ?? []).length === 0 ? <p className="text-muted">لا توجد واجبات مفتوحة.</p> : (
          <ul className="divide-y divide-line">
            {(assignmentsRes.data as Assignment[]).map((a) => (
              <li key={a.id} className="flex justify-between gap-2 py-2">
                <span>{ACTIVITY[a.activity]}: {formatRange(a)}{a.due_on ? ` · ${formatDate(a.due_on)}` : ""}</span>
                <Badge tone="gold">{ASSIGNMENT_STATUS[a.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-800">آخر التسميعات المعتمدة</h2>
        {records.length === 0 ? <EmptyState title="لا توجد سجلات بعد" /> : <ProgressList records={records} reactions={reactions} />}
      </section>
    </div>
  );
}
