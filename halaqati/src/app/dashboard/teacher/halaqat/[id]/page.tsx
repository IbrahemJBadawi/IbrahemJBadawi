import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { halaqaRoster, personName } from "@/lib/data/halaqat";
import { loadHalaqaForStaff } from "@/lib/data/staff";
import { formatDate, formatDateTime, formatSchedule } from "@/lib/format";
import { HALAQA_STATUS, JOIN_POLICY, MEETING_MODE, SESSION_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { isoFromNow, utcToLocalInput } from "@/lib/time";
import type { Session } from "@/lib/types";
import { decideJoinAction, removeMemberAction } from "../../actions";
import { SessionForm } from "../../SessionForm";

export const metadata: Metadata = { title: "إدارة الحلقة" };

export default async function TeacherHalaqaPage({ params, searchParams }: PageProps<"/dashboard/teacher/halaqat/[id]">) {
  const user = await requireContext("quran_teacher");
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const loaded = await loadHalaqaForStaff(supabase, user, id);
  if (!loaded) notFound();
  const { halaqa: h, isManager } = loaded;

  const [pending, active, upcomingRes, pastRes] = await Promise.all([
    halaqaRoster(supabase, id, ["pending"]),
    halaqaRoster(supabase, id, ["active"]),
    supabase.from("quran_sessions").select("*").eq("halaqa_id", id).gte("starts_at", isoFromNow(-6 * 3600e3)).order("starts_at").limit(10),
    supabase.from("quran_sessions").select("*").eq("halaqa_id", id).lt("starts_at", isoFromNow(-6 * 3600e3)).order("starts_at", { ascending: false }).limit(10),
  ]);
  const upcoming = (upcomingRes.data ?? []) as Session[];
  const past = (pastRes.data ?? []) as Session[];
  const lastUrl = [...past, ...upcoming].find((s) => s.meeting_url)?.meeting_url;
  const defaultStart = utcToLocalInput(isoFromNow(24 * 3600e3), h.timezone).slice(0, 11) + "17:00";
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={h.name}
        description={<>{h.center_id ? "حلقة تابعة لمركز" : "حلقة مستقلة"} · {MEETING_MODE[h.meeting_mode]} · {JOIN_POLICY[h.join_policy]}</>}
        actions={
          <>
            <Badge tone={h.status === "published" ? "green" : "gray"}>{HALAQA_STATUS[h.status]}</Badge>
            {isManager && <ButtonLink variant="secondary" href={`/dashboard/teacher/halaqat/${id}/edit`}>تعديل</ButtonLink>}
            {h.status === "published" && <ButtonLink variant="ghost" href={`/halaqat/${id}`}>الصفحة العامة</ButtonLink>}
          </>
        }
      />
      {sp.created && <Alert tone="success">تم إنشاء الحلقة.{h.status !== "published" && " غيّر حالتها إلى «منشورة» من صفحة التعديل ليراها الطلاب."}</Alert>}
      {sp.updated && <Alert tone="success">تم حفظ التعديلات.</Alert>}
      {error && <Alert tone="error">{error}</Alert>}
      {formatSchedule(h.schedule).length > 0 && <p className="text-muted">المواعيد: {formatSchedule(h.schedule).join(" · ")}</p>}

      {pending.rows.length > 0 && (
        <Card className="border-gold">
          <h2 className="mb-3 text-lg font-bold text-brand-800">طلبات الانضمام ({pending.rows.length})</h2>
          <ul className="divide-y divide-line">
            {pending.rows.map((m) => (
              <li key={m.id} className="flex flex-col gap-2 py-3">
                <div>
                  <span className="font-semibold">{personName(m.profiles)}</span>
                  <span className="text-sm text-muted"> · {formatDate(m.created_at)}</span>
                  {m.request_message && <p className="mt-1 text-muted">«{m.request_message}»</p>}
                </div>
                <form action={decideJoinAction} className="flex flex-wrap items-center gap-2">
                  <input type="hidden" name="membershipId" value={m.id} />
                  <input type="hidden" name="halaqaId" value={id} />
                  <Input name="note" placeholder="ملاحظة للطالب (اختياري)" className="!min-h-10 sm:max-w-xs" aria-label="ملاحظة" />
                  <Button type="submit" name="decision" value="approve">قبول</Button>
                  <Button type="submit" name="decision" value="reject" variant="secondary">اعتذار</Button>
                </form>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">الطلاب ({active.rows.length} / {h.max_students})</h2>
        {active.rows.length === 0 ? (
          <p className="text-muted">لا يوجد طلاب بعد.</p>
        ) : (
          <ul className="divide-y divide-line">
            {active.rows.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link href={`/dashboard/teacher/halaqat/${id}/students/${m.user_id}`} className="font-semibold text-brand-900 underline">{personName(m.profiles)}</Link>
                {isManager && (
                  <form action={removeMemberAction}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <input type="hidden" name="halaqaId" value={id} />
                    <Button type="submit" variant="ghost" className="text-sm">إنهاء العضوية</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">الجلسات القادمة</h2>
        {upcoming.length === 0 ? <p className="mb-3 text-muted">لا توجد جلسات قادمة.</p> : (
          <ul className="mb-4 divide-y divide-line">
            {upcoming.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>{formatDateTime(s.starts_at, h.timezone)} <Badge>{SESSION_STATUS[s.status]}</Badge></span>
                <ButtonLink variant="secondary" href={`/dashboard/teacher/sessions/${s.id}`}>فتح الجلسة</ButtonLink>
              </li>
            ))}
          </ul>
        )}
        <details>
          <summary className="cursor-pointer font-semibold text-brand-800">إضافة جلسة</summary>
          <div className="mt-3">
            <SessionForm halaqaId={id} defaultMode={h.meeting_mode} defaultStart={defaultStart} lastMeetingUrl={lastUrl} timezone={h.timezone} />
          </div>
        </details>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">الجلسات السابقة</h2>
        {past.length === 0 ? <EmptyState title="لا توجد جلسات سابقة" /> : (
          <ul className="divide-y divide-line">
            {past.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2.5">
                <span>{formatDateTime(s.starts_at, h.timezone)} <Badge>{SESSION_STATUS[s.status]}</Badge></span>
                <Link href={`/dashboard/teacher/sessions/${s.id}`} className="font-semibold text-brand-800 underline">التفاصيل</Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
