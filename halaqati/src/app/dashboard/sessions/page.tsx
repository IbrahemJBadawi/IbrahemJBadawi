import type { Metadata } from "next";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { studentMemberships } from "@/lib/data/halaqat";
import { formatDateTime } from "@/lib/format";
import { ATTENDANCE, SESSION_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { isoFromNow } from "@/lib/time";
import type { Session } from "@/lib/types";

export const metadata: Metadata = { title: "جلساتي" };

export default async function MySessionsPage() {
  const user = await requireContext("student");
  const supabase = await createClient();
  const { rows } = await studentMemberships(supabase, user.id, ["active"]);
  const ids = rows.map((r) => r.halaqa_id);
  if (!ids.length) return (<><PageHeader title="جلساتي" /><EmptyState title="لست عضوًا في أي حلقة حاليًا" /></>);
  const cutoff = isoFromNow(-3 * 3600e3);
  const [up, past, att] = await Promise.all([
    supabase.from("quran_sessions").select("*").in("halaqa_id", ids).gte("starts_at", cutoff).order("starts_at").limit(20),
    supabase.from("quran_sessions").select("*").in("halaqa_id", ids).lt("starts_at", cutoff).order("starts_at", { ascending: false }).limit(20),
    supabase.from("attendance_records").select("session_id, status").eq("student_id", user.id).limit(200),
  ]);
  const attMap = new Map((att.data ?? []).map((a) => [a.session_id, a.status as string]));
  const halaqatMap = new Map(rows.map((r) => [r.halaqa_id, { name: r.halaqat?.name ?? "", timezone: r.halaqat?.timezone }]));
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="جلساتي" />
      <Card><h2 className="mb-2 text-lg font-bold text-brand-800">القادمة</h2>{(up.data ?? []).length ? <SessionList items={up.data as Session[]} halaqat={halaqatMap} attendance={attMap} /> : <p className="text-muted">لا توجد جلسات قادمة.</p>}</Card>
      <Card><h2 className="mb-2 text-lg font-bold text-brand-800">السابقة والحضور</h2>{(past.data ?? []).length ? <SessionList items={past.data as Session[]} halaqat={halaqatMap} attendance={attMap} showAttendance /> : <p className="text-muted">لا توجد جلسات سابقة.</p>}</Card>
    </div>
  );
}

function SessionList({ items, halaqat, attendance, showAttendance }: {
  items: Session[];
  halaqat: Map<string, { name: string; timezone?: string }>;
  attendance: Map<string, string>;
  showAttendance?: boolean;
}) {
  return (
    <ul className="divide-y divide-line">
      {items.map((s) => {
        const h = halaqat.get(s.halaqa_id);
        const a = attendance.get(s.id);
        return (
          <li key={s.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{h?.name}</p>
              <p className="text-sm text-muted">{formatDateTime(s.starts_at, h?.timezone)} · {s.duration_minutes} دقيقة</p>
              {!showAttendance && s.status === "scheduled" && s.meeting_url && (
                <a href={s.meeting_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-800 underline">رابط اللقاء</a>
              )}
            </div>
            <span className="flex gap-2">
              <Badge tone={s.status === "cancelled" ? "red" : "gray"}>{SESSION_STATUS[s.status]}</Badge>
              {a && <Badge tone={a === "absent" ? "red" : "green"}>{ATTENDANCE[a]}</Badge>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
