import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/Field";
import { OrderStatusBadge, formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "الطلبات" };

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in t.orderStatus ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const tests = sp.tests === "1";
  const rows = await withAdmin((tx) => {
    const where = ["true"];
    const params: unknown[] = [];
    if (status === "confirmed") where.push("o.status in ('confirmed','processing')");
    else if (status) { params.push(status); where.push(`o.status = $${params.length}`); }
    if (q) { params.push(`%${q}%`); where.push(`(o.order_number ilike $${params.length} or o.customer_name ilike $${params.length} or o.customer_phone ilike $${params.length})`); }
    if (!tests) where.push("not o.is_test");
    return tx.query<{ id: string; order_number: string; customer_name: string; country_code: string; city: string; status: string; payment_status: string; payment_method: string; total: string; currency_code: string; created_at: string; is_test: boolean; unsent: number }>(
      `select o.id, o.order_number, o.customer_name, o.country_code, o.city, o.status, o.payment_status, o.payment_method, o.total::text,
              o.currency_code, o.created_at::text, o.is_test,
              (select count(*)::int from public.fulfillment_records f where f.order_id = o.id and f.status = 'pending') as unsent
       from public.orders o where ${where.join(" and ")} order by o.created_at desc limit 300`,
      params,
    );
  });
  return (
    <>
      <AdminTitle title="الطلبات" description={`${rows.length} طلب`} />
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="q" defaultValue={q} placeholder="رقم الطلب، الاسم أو الهاتف" className="max-w-xs" />
        <Select name="status" defaultValue={status} className="w-auto">
          <option value="">كل الحالات</option>
          {Object.entries(t.orderStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tests" value="1" defaultChecked={tests} className="accent-ink" /> إظهار طلبات الاختبار</label>
        <button className="h-10 rounded-md border border-line bg-paper px-4 text-sm">تصفية</button>
      </form>
      <Table head={["الطلب", "العميل", "الوجهة", "الحالة", "الدفع", "الإجمالي", "التاريخ"]} empty={!rows.length}>
        {rows.map((o) => (
          <tr key={o.id}>
            <td className={td}>
              <Link href={`/admin/orders/${o.id}`} className="ltr font-mono font-semibold hover:underline">{o.order_number}</Link>
              {o.is_test && <span className="ms-2 text-xs text-warning">اختبار</span>}
              {o.unsent > 0 && !["cancelled", "pending"].includes(o.status) && <div className="text-xs text-warning">لم يُرسل للمورد</div>}
            </td>
            <td className={td}>{o.customer_name}</td>
            <td className={td}>{o.country_code} — {o.city}</td>
            <td className={td}><OrderStatusBadge status={o.status} /></td>
            <td className={`${td} text-xs`}>{label(t.paymentStatus, o.payment_status)}<div className="text-muted">{o.payment_method === "cod" ? "عند الاستلام" : "يدوي"}</div></td>
            <td className={td}>{formatMoney(o.total, o.currency_code)}</td>
            <td className={`${td} text-xs text-muted`}>{formatDate(o.created_at)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
