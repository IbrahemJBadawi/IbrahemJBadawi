import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OverviewStats } from "@/components/OverviewStats";
import { ProgressList, type RecordWithErrors } from "@/components/ProgressList";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { personName } from "@/lib/data/halaqat";
import { loadHalaqaForStaff } from "@/lib/data/staff";
import { formatDate } from "@/lib/format";
import { ACTIVITY, ASSIGNMENT_STATUS } from "@/lib/labels";
import { formatRange } from "@/lib/quran/surahs";
import { loadReactions } from "@/lib/data/motivation";
import { SummaryChips } from "@/components/motivation/SummaryChips";
import { halaqaSummaries } from "@/lib/data/summary";
import { LEVEL } from "@/lib/labels";
import { BarChart, weekLabel } from "@/components/motivation/BarChart";
import type { WeekStat } from "@/components/motivation/StudentStatsView";
import { createClient } from "@/lib/supabase/server";
import type { Assignment, StudentOverview } from "@/lib/types";
import { approveRecordAction, cancelAssignmentAction, deleteDraftAction } from "../../../../actions";
import { AmendForm, AssignmentForm, RecitationForm } from "../../../../RecitationForms";
import { CertificateForm } from "../../../../CertificateForm";

export const metadata: Metadata = { title: "متابعة الطالب" };

export default async function TeacherStudentPage({ params, searchParams }: PageProps<"/dashboard/teacher/halaqat/[id]/students/[studentId]">) {
  const user = await requireContext("quran_teacher");
  const { id, studentId } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const loaded = await loadHalaqaForStaff(supabase, user, id);
  if (!loaded || !/^[0-9a-f-]{36}$/i.test(studentId)) notFound();

  const { data: membership } = await supabase
    .from("halaqa_memberships")
    .select("status, profiles!halaqa_memberships_user_id_fkey(full_name, display_name)")
    .eq("halaqa_id", id)
    .eq("user_id", studentId)
    .eq("role", "student")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!membership) notFound();
  const name = personName(membership.profiles as unknown as { full_name: string; display_name: string | null });
  const isActive = membership.status === "active";
  const sessionId = typeof sp.session === "string" && /^[0-9a-f-]{36}$/i.test(sp.session) ? sp.session : null;

  const [overviewRes, recordsRes, assignmentsRes, streakRes, certsRes, statsRes] = await Promise.all([
    supabase.rpc("get_student_overview", { p_student: studentId, p_days: 30, p_halaqa: id }),
    supabase
      .from("quran_progress_records")
      .select("*, quran_error_records(id, error_type, surah, ayah, note)")
      .eq("halaqa_id", id)
      .eq("student_id", studentId)
      .order("recorded_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("quran_assignments").select("*").eq("halaqa_id", id).eq("student_id", studentId).order("created_at", { ascending: false }).limit(10),
    supabase.rpc("get_student_streak", { p_student: studentId, p_halaqa: id }),
    supabase.from("certificates").select("id, serial, title, issued_on, revoked_at").eq("halaqa_id", id).eq("student_id", studentId).order("issued_on", { ascending: false }).limit(20),
    supabase.rpc("get_student_stats", { p_student: studentId, p_weeks: 12, p_halaqa: id }),
  ]);
  const streak = (streakRes.data as number | null) ?? 0;
  const certs = (certsRes.data ?? []) as Array<{ id: string; serial: string; title: string; issued_on: string; revoked_at: string | null }>;
  const overview = overviewRes.data as StudentOverview | null;
  const records = (recordsRes.data ?? []) as RecordWithErrors[];
  const reactions = await loadReactions(supabase, "progress_record", records.map((r) => r.id), user.id);
  const weeks = (statsRes.data ?? []) as WeekStat[];
  const summary = (await halaqaSummaries(supabase, id, `${loaded.halaqa.name} · ${LEVEL[loaded.halaqa.level] ?? ""}`)).get(studentId);
  const assignments = (assignmentsRes.data ?? []) as Assignment[];
  const openAssignment = assignments.find((a) => a.status === "assigned") ?? null;
  const lastNew = records.find((r) => r.activity === "new_memorization" && r.status === "approved");
  const path = `/dashboard/teacher/halaqat/${id}/students/${studentId}`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={name} description={<>طالب في <Link href={`/dashboard/teacher/halaqat/${id}`} className="font-semibold underline">{loaded.halaqa.name}</Link>{!isActive && " — العضوية غير نشطة"}</>} />
      {summary && <Card><SummaryChips s={summary} /></Card>}
      {overview && <OverviewStats o={overview} />}
      <p className="text-muted">سلسلة الالتزام: <strong className="text-brand-900">{streak}</strong> أسبوع متتالٍ</p>
      {weeks.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card><BarChart title="النقاط أسبوعيًا في هذه الحلقة" unit="نقطة" data={weeks.map((w) => ({ key: w.week, label: weekLabel(w.week), value: w.points, tip: `أسبوع ${weekLabel(w.week)}: ${w.points} نقطة` }))} /></Card>
          <Card><BarChart title="الحفظ الجديد أسبوعيًا (آية)" unit="آية" data={weeks.map((w) => ({ key: w.week, label: weekLabel(w.week), value: w.new_ayat, tip: `أسبوع ${weekLabel(w.week)}: ${w.new_ayat} آية` }))} /></Card>
        </div>
      )}

      {isActive && (
        <Card>
          <h2 className="mb-3 text-lg font-bold text-brand-800">تسجيل تسميع {sessionId && <Badge tone="green">مرتبط بالجلسة</Badge>}</h2>
          <RecitationForm halaqaId={id} studentId={studentId} sessionId={sessionId} assignment={openAssignment} />
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">الواجب القادم</h2>
        {openAssignment ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 p-3">
            <span>
              <span className="font-semibold">{ACTIVITY[openAssignment.activity]}: {formatRange(openAssignment)}</span>
              <span className="block text-sm text-muted">{openAssignment.ayah_count} آية{openAssignment.due_on ? ` · ${formatDate(openAssignment.due_on)}` : ""}</span>
            </span>
            <form action={cancelAssignmentAction}>
              <input type="hidden" name="assignmentId" value={openAssignment.id} />
              <input type="hidden" name="path" value={path} />
              <Button type="submit" variant="ghost">إلغاء الواجب</Button>
            </form>
          </div>
        ) : (
          <p className="mb-3 text-muted">لا يوجد واجب مفتوح.</p>
        )}
        {isActive && (
          <details>
            <summary className="cursor-pointer font-semibold text-brand-800">تحديد واجب جديد</summary>
            <div className="mt-3">
              <AssignmentForm halaqaId={id} studentId={studentId} defaults={lastNew ? { surahFrom: lastNew.surah_to, ayahFrom: lastNew.ayah_to } : undefined} />
            </div>
          </details>
        )}
        {assignments.filter((a) => a.status !== "assigned").length > 0 && (
          <ul className="mt-4 divide-y divide-line text-sm">
            {assignments.filter((a) => a.status !== "assigned").map((a) => (
              <li key={a.id} className="flex justify-between gap-2 py-2">
                <span>{ACTIVITY[a.activity]}: {formatRange(a)}</span>
                <Badge tone={a.status === "completed" ? "green" : "gray"}>{ASSIGNMENT_STATUS[a.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">الشهادات</h2>
        {certs.length > 0 && (
          <ul className="mb-3 divide-y divide-line">
            {certs.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link href={`/verify/${c.serial}`} className="font-semibold underline">{c.title}</Link>
                <span className="text-sm text-muted">{formatDate(c.issued_on)} {c.revoked_at && <Badge tone="red">ملغاة</Badge>}</span>
              </li>
            ))}
          </ul>
        )}
        {isActive && (
          <details>
            <summary className="cursor-pointer font-semibold text-brand-800">إصدار شهادة إنجاز</summary>
            <div className="mt-3"><CertificateForm halaqaId={id} studentId={studentId} /></div>
          </details>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-800">سجل التسميع</h2>
        {records.length === 0 ? <EmptyState title="لا توجد سجلات بعد" /> : (
          <ProgressList
            records={records}
            reactions={reactions}
            renderActions={(r) =>
              r.status === "draft" ? (
                <div className="mt-3 flex gap-2">
                  <form action={approveRecordAction}>
                    <input type="hidden" name="recordId" value={r.id} />
                    <input type="hidden" name="path" value={path} />
                    <Button type="submit">اعتماد</Button>
                  </form>
                  <form action={deleteDraftAction}>
                    <input type="hidden" name="recordId" value={r.id} />
                    <input type="hidden" name="path" value={path} />
                    <Button type="submit" variant="ghost">حذف المسودة</Button>
                  </form>
                </div>
              ) : (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-brand-800">تعديل السجل المعتمد (بسبب موثّق)</summary>
                  <AmendForm record={r} />
                </details>
              )
            }
          />
        )}
      </section>
    </div>
  );
}
