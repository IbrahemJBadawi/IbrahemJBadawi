import type { Metadata } from "next";
import { Card, EmptyState, PageHeader, Pagination } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "سجل التدقيق" };
const PAGE_SIZE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/dashboard/admin/audit">) {
  await requireContext("platform_admin");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_id, metadata, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="سجل التدقيق" description="سجل للقراءة فقط؛ لا يمكن تعديله أو حذفه من التطبيق." />
      {rows.length === 0 ? <EmptyState title="لا توجد عمليات مسجلة" /> : (
        <Card className="overflow-x-auto !p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-brand-50 text-right">
              <tr><th className="p-2">الوقت</th><th className="p-2">العملية</th><th className="p-2">الكيان</th><th className="p-2">المنفّذ</th><th className="p-2">تفاصيل</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line align-top">
                  <td className="p-2 whitespace-nowrap">{formatDateTime(r.created_at)}</td>
                  <td className="p-2 font-mono" dir="ltr">{r.action}</td>
                  <td className="p-2 font-mono text-xs" dir="ltr">{r.entity_type}:{r.entity_id?.slice(0, 8)}</td>
                  <td className="p-2 font-mono text-xs" dir="ltr">{r.actor_id?.slice(0, 8) ?? "system"}</td>
                  <td className="p-2"><code className="block max-w-xs truncate text-xs" dir="ltr">{JSON.stringify(r.metadata)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => `/dashboard/admin/audit?page=${p}`} />
    </>
  );
}
