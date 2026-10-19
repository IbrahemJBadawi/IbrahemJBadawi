import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "الفواتير" };

export default async function AdminInvoices() {
  const rows = await withAdmin((tx) =>
    tx.query<{ order_id: string; invoice_no: string; customer_name: string; total: string; currency_code: string; status: string; issued_at: string; is_test: boolean }>(
      `select i.order_id, i.invoice_no, i.customer_name, i.total::text, i.currency_code, i.status, i.issued_at::text, o.is_test
       from public.invoices i join public.orders o on o.id = i.order_id order by i.issued_at desc limit 500`,
    ),
  );
  return (
    <>
      <AdminTitle title="الفواتير" description="تصدر تلقائيًا عند تأكيد الدفع، وتُعلَّم مستردة ولا تُحذف أبدًا. أضف الاسم القانوني والرقم الضريبي من الإعدادات." />
      <Table head={["الفاتورة", "العميل", "الإجمالي", "الحالة", "التاريخ"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.invoice_no}>
            <td className={td}><Link href={`/admin/invoices/${r.order_id}`} className="ltr font-mono font-semibold hover:underline">{r.invoice_no}</Link>{r.is_test && <span className="ms-2 text-xs text-warning">اختبار</span>}</td>
            <td className={td}>{r.customer_name}</td>
            <td className={td}>{formatMoney(r.total, r.currency_code)}</td>
            <td className={td}><Badge tone={r.status === "issued" ? "success" : "danger"}>{r.status === "issued" ? "صادرة" : r.status === "refunded" ? "مستردة" : "مستردة جزئيًا"}</Badge></td>
            <td className={`${td} text-xs text-muted`}>{formatDate(r.issued_at)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
