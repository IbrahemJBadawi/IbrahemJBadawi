import type { Metadata } from "next";
import { WeeklyTimetable } from "@/components/WeeklyTimetable";
import { ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { staffHalaqat } from "@/lib/data/halaqat";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { isoFromNow, weekdayIn } from "@/lib/time";
import type { Session } from "@/lib/types";

export const metadata: Metadata = { title: "جدول المحفّظ" };

export default async function TeacherSchedulePage() {
  const user = await requireContext("quran_teacher");
  const supabase = await createClient();
  const { rows } = await staffHalaqat(supabase, user.id);
  const ids = rows.map((r) => r.halaqa_id);
  if (!ids.length) return (<><PageHeader title="جدولي الأسبوعي" /><EmptyState title="لا توجد حلقات بعد" /></>);
  const [{ data: halaqat }, { data: sessions }] = await Promise.all([
    supabase.from("halaqat").select("id, name, timezone, schedule").in("id", ids).is("deleted_at", null),
    supabase.from("quran_sessions").select("*").in("halaqa_id", ids).eq("status", "scheduled")
      .gte("starts_at", isoFromNow(-3 * 3600e3)).lte("starts_at", isoFromNow(7 * 24 * 3600e3)).order("starts_at").limit(50),
  ]);
  const list = ((halaqat ?? []) as Array<{ id: string; name: string; timezone: string; schedule: unknown }>).map((h) => ({ ...h, href: `/dashboard/teacher/halaqat/${h.id}` }));
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="جدولي الأسبوعي" description="مواعيد كل حلقاتك الثابتة وجلسات الأسبوع القادم." />
      <WeeklyTimetable halaqat={list} today={weekdayIn(list[0]?.timezone ?? "Asia/Riyadh")} />
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">جلسات الأيام السبعة القادمة</h2>
        {(sessions ?? []).length === 0 ? <p className="text-muted">لا توجد جلسات مجدولة.</p> : (
          <ul className="divide-y divide-line">
            {(sessions as Session[]).map((s) => {
              const h = list.find((x) => x.id === s.halaqa_id);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span><span className="font-semibold">{h?.name}</span><span className="block text-sm text-muted">{formatDateTime(s.starts_at, h?.timezone)}</span></span>
                  <ButtonLink variant="secondary" href={`/dashboard/teacher/sessions/${s.id}`}>فتح الجلسة</ButtonLink>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
