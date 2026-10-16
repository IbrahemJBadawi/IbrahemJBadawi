import Link from "next/link";
import { Card, Stat } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export async function AdminHome() {
  const supabase = await createClient();
  const [orgs, centers, privacy] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("centers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("privacy_requests").select("id", { count: "exact", head: true }).in("status", ["pending", "processing"]),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-xl font-bold text-brand-900">إدارة المنصة</h2>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="مؤسسات بانتظار التوثيق" value={orgs.count ?? 0} />
        <Stat label="مراكز بانتظار التوثيق" value={centers.count ?? 0} />
        <Stat label="طلبات خصوصية مفتوحة" value={privacy.count ?? 0} />
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
