import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { halaqaRoster, personName } from "@/lib/data/halaqat";
import { loadHalaqaForStaff } from "@/lib/data/staff";
import { formatDateTime } from "@/lib/format";
import { ACTIVITY, MEETING_MODE, SESSION_STATUS } from "@/lib/labels";
import { formatRange } from "@/lib/quran/surahs";
import { createClient } from "@/lib/supabase/server";
import type { ProgressRecord, Session } from "@/lib/types";
import { setSessionStatusAction } from "../../actions";
import { AttendanceForm } from "../../AttendanceForm";

export const metadata: Metadata = { title: "الجلسة" };

export default async function SessionPage({ params }: PageProps<"/dashboard/teacher/sessions/[sessionId]">) {
  const user = await requireContext("quran_teacher");
  const { sessionId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(sessionId)) notFound();
  const supabase = await createClient();
  const { data: s } = await supabase.from("quran_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (!s) notFound();
  const session = s as Session;
  const loaded = await loadHalaqaForStaff(supabase, user, session.halaqa_id);
  if (!loaded) notFound();
  const { halaqa } = loaded;

  const [roster, attendanceRes, recordsRes] = await Promise.all([
    halaqaRoster(supabase, halaqa.id, ["active"]),
    supabase.from("attendance_records").select("student_id, status").eq("session_id", sessionId),
    supabase.from("quran_progress_records").select("*").eq("session_id", sessionId).order("created_at"),
  ]);
  const att = new Map((attendanceRes.data ?? []).map((a) => [a.student_id, a.status as string]));
  const records = (recordsRes.data ?? []) as ProgressRecord[];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`جلسة ${halaqa.name}`}
        description={<>{formatDateTime(session.starts_at, halaqa.timezone)} · {session.duration_minutes} دقيقة · {MEETING_MODE[session.mode]}</>}
        actions={<Badge tone={session.status === "completed" ? "green" : session.status === "cancelled" ? "red" : "gold"}>{SESSION_STATUS[session.status]}</Badge>}
      />
      <p><Link href={`/dashboard/teacher/halaqat/${halaqa.id}`} className="font-semibold text-brand-800 underline">← العودة إلى الحلقة</Link></p>
      {session.meeting_url && (
        <Alert tone="info">
          رابط اللقاء: <a href={session.meeting_url} target="_blank" rel="noopener noreferrer" className="font-semibold underline" dir="ltr">{session.meeting_url}</a>
        </Alert>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">الحضور</h2>
        {roster.rows.length === 0 ? (
          <EmptyState title="لا يوجد طلاب نشطون في الحلقة" />
        ) : (
          <AttendanceForm sessionId={sessionId} rows={roster.rows.map((m) => ({ studentId: m.user_id, name: personName(m.profiles), status: att.get(m.user_id) ?? null }))} />
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">التسميع في هذه الجلسة</h2>
        <ul className="divide-y divide-line">
          {roster.rows.map((m) => {
            const mine = records.filter((r) => r.student_id === m.user_id);
            return (
              <li key={m.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{personName(m.profiles)}</p>
                  {mine.length === 0 ? <p className="text-sm text-muted">لم يُسجَّل تسميع بعد</p> : mine.map((r) => (
                    <p key={r.id} className="text-sm text-muted">
                      {ACTIVITY[r.activity]}: {formatRange(r)} ({r.ayah_count} آية) {r.status === "draft" && <Badge tone="gold">مسودة</Badge>}
                    </p>
                  ))}
                </div>
                <ButtonLink variant="secondary" href={`/dashboard/teacher/halaqat/${halaqa.id}/students/${m.user_id}?session=${sessionId}`}>تسجيل تسميع</ButtonLink>
              </li>
            );
          })}
        </ul>
      </Card>

      {session.status === "scheduled" && (
        <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <form action={setSessionStatusAction}>
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="status" value="completed" />
            <Button type="submit">تعليم الجلسة كمنعقدة</Button>
          </form>
          <form action={setSessionStatusAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="status" value="cancelled" />
            <Input name="reason" placeholder="سبب الإلغاء (اختياري)" className="sm:max-w-xs" aria-label="سبب الإلغاء" />
            <Button type="submit" variant="secondary">إلغاء الجلسة</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
