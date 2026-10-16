import { withAdmin } from "@/lib/admin";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "سجل العمليات" };

export default async function AdminAudit() {
  const rows = await withAdmin((tx) =>
    tx.query<{ id: string; action: string; entity: string; entity_id: string | null; details: Record<string, unknown>; created_at: string; actor: string | null }>(
      `select a.id::text, a.action, a.entity, a.entity_id, a.details, a.created_at::text, p.email as actor
       from public.audit_log a left join public.profiles p on p.id = a.actor_id order by a.created_at desc limit 300`,
    ),
  );
  return (
    <>
      <AdminTitle title="سجل العمليات الإدارية" description="سجل غير قابل للتعديل لأهم عمليات الإدارة (آخر 300)." />
      <Table head={["الوقت", "المسؤول", "العملية", "العنصر", "التفاصيل"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={`${td} whitespace-nowrap text-xs text-muted`}>{formatDate(r.created_at)}</td>
            <td className={`${td} ltr text-xs`}>{r.actor ?? "سطر الأوامر"}</td>
            <td className={td}>{r.action}</td>
            <td className={`${td} text-xs`}>{r.entity}<div className="ltr text-muted">{r.entity_id?.slice(0, 8)}</div></td>
            <td className={`${td} ltr max-w-sm truncate font-mono text-xs`} title={JSON.stringify(r.details)}>{JSON.stringify(r.details)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
