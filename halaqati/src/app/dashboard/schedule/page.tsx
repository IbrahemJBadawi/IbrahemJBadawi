import type { Metadata } from "next";
import { JoinMeetingButton } from "@/components/JoinMeetingButton";
import { WeeklyTimetable } from "@/components/WeeklyTimetable";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { studentMemberships } from "@/lib/data/halaqat";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isoFromNow, weekdayIn } from "@/lib/time";
import type { Session } from "@/lib/types";

export const metadata: Metadata = { title: "جدولي الأسبوعي" };

export default async function StudentSchedulePage() {
  const user = await requireContext("student");
  const supabase = await createClient();
  const { rows } = await studentMemberships(supabase, user.id, ["active"]);
  const ids = rows.map((r) => r.halaqa_id);
  if (!ids.length) {
    return (<><PageHeader title="جدولي الأسبوعي" /><EmptyState title="لا توجد حلقات في جدولك"><ButtonLink href="/halaqat" className="mt-3">ابحث عن حلقة</ButtonLink></EmptyState></>);
  }
  const [{ data: halaqat }, { data: sessions }] = await Promise.all([
    supabase.from("halaqat").select("id, name, timezone, schedule").in("id", ids),
    supabase.from("quran_sessions").select("*").in("halaqa_id", ids).eq("status", "scheduled")
      .gte("starts_at", isoFromNow(-3 * 3600e3)).lte("starts_at", isoFromNow(7 * 24 * 3600e3)).order("starts_at").limit(30),
  ]);
  const list = (halaqat ?? []) as Array<{ id: string; name: string; timezone: string; schedule: unknown }>;
  const tz = list[0]?.timezone ?? "Asia/Riyadh";
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="جدولي الأسبوعي" description="المواعيد الثابتة لحلقاتك، والجلسات المجدولة خلال الأيام السبعة القادمة." />
      <WeeklyTimetable halaqat={list} today={weekdayIn(tz)} />
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">الجلسات القادمة هذا الأسبوع</h2>
        {(sessions ?? []).length === 0 ? <p className="text-muted">لا توجد جلسات مجدولة.</p> : (
          <ul className="divide-y divide-line">
            {(sessions as Session[]).map((s) => {
              const h = list.find((x) => x.id === s.halaqa_id);
              return (
                <li key={s.id} className="py-3">
                  <p className="font-semibold">{h?.name}</p>
                  <p className="text-sm text-muted">{formatDateTime(s.starts_at, h?.timezone)} · {s.duration_minutes} دقيقة{s.topic ? ` · ${s.topic}` : ""}</p>
                  <JoinMeetingButton url={s.meeting_url} startsAt={s.starts_at} durationMinutes={s.duration_minutes} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
