import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { formatMoney, fromMills, toMills } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "مستحقات الموردين" };

export default async function Settlements({ searchParams }: PageProps<"/admin/settlements">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in t.settlementStatus ? sp.status : "";
  const rows = await withAdmin((tx) =>
    tx.query<{ order_id: string; order_number: string; supplier: string | null; settlement_status: string; actual_cost: string | null; actual_shipping_cost: string | null; shipping_paid_to: string; expected_cost: string | null; cost_currency: string | null; settlement_paid_amount: string | null; settlement_paid_at: string | null; settlement_reference: string | null; recorded_by: string | null; order_payment: string }>(
      `select o.id as order_id, o.order_number, s.name as supplier, f.settlement_status, f.actual_cost::text, f.actual_shipping_cost::text,
              f.shipping_paid_to, f.expected_cost::text, coalesce(f.cost_currency, o.currency_code) as cost_currency,
              f.settlement_paid_amount::text, f.settlement_paid_at::text, f.settlement_reference, p.email as recorded_by, o.payment_status as order_payment
       from public.fulfillment_records f join public.orders o on o.id = f.order_id
       left join public.suppliers s on s.id = f.supplier_id left join public.profiles p on p.id = f.settlement_recorded_by
       where not o.is_test ${status ? "and f.settlement_status = $1" : "and f.settlement_status <> 'not_due'"}
       order by (f.settlement_status in ('due','awaiting_transfer','disputed')) desc, o.created_at desc limit 300`,
      status ? [status] : [],
    ),
  );
  const due = (r: (typeof rows)[number]) =>
    r.actual_cost !== null ? fromMills(toMills(r.actual_cost) + (r.shipping_paid_to === "supplier" ? toMills(r.actual_shipping_cost) : 0)) : r.expected_cost;
  return (
    <>
      <AdminTitle title="مستحقات الموردين" description="التحويل للمورد يتم يدويًا خارج المنصة؛ هنا يُوثّق فقط. تُسجّل التسوية من صفحة الطلب." />
      <form className="mb-4 flex gap-2">
        <Select name="status" defaultValue={status} className="w-auto" aria-label="حالة التسوية">
          <option value="">كل ما استُحق</option>
          {Object.entries(t.settlementStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <button className="h-10 rounded-md border border-line bg-paper px-4 text-sm">تصفية</button>
      </form>
      <Table head={["الطلب", "المورد", "المستحق", "الحالة", "المحوّل", "التاريخ والمرجع", "سجّلها"]} empty={!rows.length}>
        {rows.map((r, i) => (
          <tr key={r.order_id + i}>
            <td className={td}><Link href={`/admin/orders/${r.order_id}`} className="ltr font-mono hover:underline">{r.order_number}</Link></td>
            <td className={td}>{r.supplier ?? "—"}</td>
            <td className={td}>{due(r) ? formatMoney(due(r)!, r.cost_currency ?? "ILS") : "—"}{r.actual_cost === null && <div className="text-xs text-muted">تقديري</div>}</td>
            <td className={td}><Badge tone={r.settlement_status === "paid" ? "success" : r.settlement_status === "disputed" ? "danger" : "warning"}>{label(t.settlementStatus, r.settlement_status)}</Badge></td>
            <td className={td}>{r.settlement_paid_amount ? formatMoney(r.settlement_paid_amount, r.cost_currency ?? "ILS") : "—"}</td>
            <td className={`${td} text-xs`}>{r.settlement_paid_at ? formatDate(r.settlement_paid_at) : ""} {r.settlement_reference}</td>
            <td className={`${td} ltr text-xs`}>{r.recorded_by ?? "—"}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
