import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, Stat } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { staffHalaqat } from "@/lib/data/halaqat";
import { formatDateTime } from "@/lib/format";
import { HALAQA_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { isoFromNow } from "@/lib/time";
import type { Session } from "@/lib/types";
import { HalaqaCharts, TasksPreview } from "@/components/motivation/HomeWidgets";
import { LeagueTable } from "@/components/motivation/LeagueTable";
import type { LeagueRow } from "@/lib/data/motivation";

export async function TeacherHome({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const { rows } = await staffHalaqat(supabase, user.id);
  const ids = rows.map((r) => r.halaqa_id);
  const [pendingRes, sessionsRes, assignmentsRes] = ids.length
    ? await Promise.all([
        supabase.from("halaqa_memberships").select("id", { count: "exact", head: true }).in("halaqa_id", ids).eq("status", "pending"),
        supabase
          .from("quran_sessions")
          .select("*")
          .in("halaqa_id", ids)
          .eq("status", "scheduled")
          .gte("starts_at", isoFromNow(-6 * 3600e3))
          .lte("starts_at", isoFromNow(36 * 3600e3))
          .order("starts_at")
          .limit(10),
        supabase.from("quran_assignments").select("id", { count: "exact", head: true }).in("halaqa_id", ids).eq("status", "assigned"),
      ])
    : [{ count: 0 }, { data: [] as Session[] }, { count: 0 }];
  const sessions = ("data" in sessionsRes ? sessionsRes.data ?? [] : []) as Session[];
  const nameOf = (id: string) => rows.find((r) => r.halaqa_id === id)?.halaqat;
  const first = rows.find((r) => r.halaqat?.status === "published") ?? rows[0];
  const top = first ? ((await supabase.rpc("get_halaqa_league", { p_halaqa: first.halaqa_id, p_period: "week" })).data ?? []) as LeagueRow[] : [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-brand-900">لوحة المحفّظ</h2>
        <ButtonLink href="/dashboard/teacher/halaqat/new">حلقة جديدة</ButtonLink>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat tone="mint" icon="🕌" label="حلقاتي" value={rows.length} />
        <Stat tone="sand" icon="📥" label="طلبات انضمام" value={pendingRes.count ?? 0} />
        <Stat tone="sky" icon="📝" label="واجبات مفتوحة" value={assignmentsRes.count ?? 0} />
      </div>
      {first?.halaqat && <HalaqaCharts supabase={supabase} halaqaId={first.halaqa_id} name={first.halaqat.name} />}
      <div className="grid gap-4 md:grid-cols-2">
        <TasksPreview supabase={supabase} userId={user.id} />
        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="font-bold text-brand-800">أبرز طلاب الأسبوع</h2>
            {first && <Link href={`/dashboard/league?h=${first.halaqa_id}`} className="text-sm font-semibold text-brand-800">الترتيب الكامل ←</Link>}
          </div>
          {top.length > 0 ? <LeagueTable rows={top} limit={3} /> : <p className="text-muted">يظهر هنا ترتيب طلاب حلقتك بالنقاط.</p>}
        </Card>
      </div>
      <Card>
        <h2 className="mb-3 font-bold text-brand-800">جلسات اليوم والغد</h2>
        {sessions.length === 0 ? (
          <p className="text-muted">لا توجد جلسات مجدولة قريبًا.</p>
        ) : (
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <span className="font-semibold">{nameOf(s.halaqa_id)?.name}</span>
                  <span className="block text-sm text-muted">{formatDateTime(s.starts_at, nameOf(s.halaqa_id)?.timezone)}</span>
                </span>
                <ButtonLink variant="secondary" href={`/dashboard/teacher/sessions/${s.id}`}>الحضور والتسميع</ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {rows.length === 0 ? (
        <EmptyState title="لم تنشئ أي حلقة بعد">ابدأ بإنشاء حلقتك المستقلة، ثم انشرها ليتمكن الطلاب من طلب الانضمام.</EmptyState>
      ) : (
        <Card>
          <h2 className="mb-3 font-bold text-brand-800">حلقاتي</h2>
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2.5">
                <Link href={`/dashboard/teacher/halaqat/${r.halaqa_id}`} className="font-semibold text-brand-900 underline">{r.halaqat?.name}</Link>
                <Badge tone={r.halaqat?.status === "published" ? "green" : "gray"}>{HALAQA_STATUS[r.halaqat?.status ?? "draft"]}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
