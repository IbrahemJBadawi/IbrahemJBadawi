import Link from "next/link";
import { BarChart, weekLabel } from "@/components/motivation/BarChart";
import { Card, Stat } from "@/components/ui";
import { CONTEXT_LABELS, isContextKey } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

type PlatformStats = {
  users: number;
  roles: Record<string, number> | null;
  halaqat_published: number;
  halaqat_total: number;
  sessions_30d: number;
  records_30d: number;
  ayat_30d: number;
  open_tickets: number;
  push_devices: number;
  signups: Array<{ week: string; count: number }>;
};

export async function AdminHome() {
  const supabase = await createClient();
  const [orgs, centers, privacy, statsRes] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("centers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("privacy_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
    supabase.rpc("admin_platform_stats"),
  ]);
  const s = statsRes.data as PlatformStats | null;
  return (
    <div className="flex flex-col gap-5">
      {s && (
        <section aria-labelledby="platform-h" className="flex flex-col gap-3">
          <h2 id="platform-h" className="text-lg font-bold">إحصائيات المنصة</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat tone="mint" icon="👥" label="المستخدمون" value={s.users} />
            <Stat tone="sky" icon="🕌" label="الحلقات المنشورة" value={s.halaqat_published} hint={`من ${s.halaqat_total} حلقة`} />
            <Stat tone="sand" icon="🗓️" label="جلسات آخر 30 يومًا" value={s.sessions_30d} />
            <Stat tone="lilac" icon="📗" label="آيات معتمدة (30 يومًا)" value={s.ayat_30d} hint={`${s.records_30d} تسميعًا`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card>
              <BarChart
                title="التسجيلات الجديدة أسبوعيًا"
                unit="مستخدم"
                data={(s.signups ?? []).map((w) => ({ key: w.week, label: weekLabel(w.week), value: w.count, tip: `أسبوع ${weekLabel(w.week)}: ${w.count} مستخدم` }))}
              />
            </Card>
            <Card>
              <h3 className="mb-2 font-bold">الأدوار</h3>
              <ul className="divide-y divide-line text-sm">
                {Object.entries(s.roles ?? {}).sort((a, b) => b[1] - a[1]).map(([role, n]) => (
                  <li key={role} className="flex justify-between py-1.5"><span>{isContextKey(role) ? CONTEXT_LABELS[role] : role}</span><span className="font-semibold tabular-nums">{n}</span></li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted">أجهزة الإشعارات المفعّلة: {s.push_devices} · بلاغات مفتوحة: {s.open_tickets}</p>
            </Card>
          </div>
        </section>
      )}
      <h2 className="text-lg font-bold">بانتظار الإجراء</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat tone="sand" icon="🏛️" label="مؤسسات بانتظار التوثيق" value={orgs.count ?? 0} />
        <Stat tone="sky" icon="🕌" label="مراكز بانتظار التوثيق" value={centers.count ?? 0} />
        <Stat tone="rose" icon="🔒" label="طلبات خصوصية مفتوحة" value={privacy.count ?? 0} />
      </div>
      <Card>
        <ul className="list-inside list-disc space-y-1">
          <li><Link className="font-semibold text-brand-800 underline" href="/dashboard/admin/users">إدارة المستخدمين والأدوار</Link></li>
          <li><Link className="font-semibold text-brand-800 underline" href="/dashboard/admin/institutions">توثيق المؤسسات والمراكز</Link></li>
          <li><Link className="font-semibold text-brand-800 underline" href="/dashboard/admin/privacy">طلبات الخصوصية</Link></li>
          <li><Link className="font-semibold text-brand-800 underline" href="/dashboard/admin/audit">سجل التدقيق</Link></li>
        </ul>
      </Card>
    </div>
  );
}
