import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { label, t } from "@/lib/i18n/ar";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "المرتجعات" };

export default async function AdminReturns() {
  const rows = await withAdmin((tx) =>
    tx.query<{ id: string; order_id: string; order_number: string; customer_name: string; reason: string; status: string; refund_amount: string | null; currency_code: string; created_at: string }>(
      `select r.id, r.order_id, o.order_number, o.customer_name, r.reason, r.status, r.refund_amount::text, o.currency_code, r.created_at::text
       from public.return_requests r join public.orders o on o.id = r.order_id order by (r.status = 'requested') desc, r.created_at desc limit 200`,
    ),
  );
  return (
    <>
      <AdminTitle title="المرتجعات" description="تتم معالجة كل طلب إرجاع من صفحة الطلب نفسه." />
      <Table head={["الطلب", "العميل", "السبب", "الحالة", "المسترد", "التاريخ"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}><Link href={`/admin/orders/${r.order_id}`} className="ltr font-mono hover:underline">{r.order_number}</Link></td>
            <td className={td}>{r.customer_name}</td>
            <td className={`${td} max-w-xs truncate`} title={r.reason}>{r.reason}</td>
            <td className={td}><Badge tone={r.status === "requested" ? "warning" : "neutral"}>{label(t.returnStatus, r.status)}</Badge></td>
            <td className={td}>{r.refund_amount ? formatMoney(r.refund_amount, r.currency_code) : "—"}</td>
            <td className={`${td} text-xs text-muted`}>{formatDate(r.created_at)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
