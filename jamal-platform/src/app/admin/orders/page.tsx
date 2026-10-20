import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { Input, Select } from "@/components/ui/Field";
import { OrderStatusBadge, formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "الطلبات" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function AdminOrders({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const status = one(sp.status) in t.orderStatus ? one(sp.status) : "";
  const payment = one(sp.payment) in t.paymentStatus ? one(sp.payment) : "";
  const q = one(sp.q).trim().slice(0, 60);
  const supplier = /^[0-9a-f-]{36}$/.test(one(sp.supplier)) ? one(sp.supplier) : "";
  const from = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.from)) ? one(sp.from) : "";
  const to = /^\d{4}-\d{2}-\d{2}$/.test(one(sp.to)) ? one(sp.to) : "";
  const tests = one(sp.tests) === "1";
  const late = one(sp.late) === "1";
  const { rows, suppliers } = await withAdmin(async (tx) => {
    const where = ["true"];
    const params: unknown[] = [];
    const add = (v: unknown) => { params.push(v); return `$${params.length}`; };
    if (status) where.push(`o.status = ${add(status)}`);
    if (payment) where.push(`o.payment_status = ${add(payment)}`);
    if (q) { const p = add(`%${q}%`); where.push(`(o.order_number ilike ${p} or o.customer_name ilike ${p} or o.customer_phone ilike ${p})`); }
    if (supplier) where.push(`exists (select 1 from public.fulfillment_records f where f.order_id = o.id and f.supplier_id = ${add(supplier)})`);
    if (from) where.push(`o.created_at >= ${add(from)}::date`);
    if (to) where.push(`o.created_at < ${add(to)}::date + 1`);
    if (late) where.push("o.status not in ('delivered','cancelled','refunded','returned') and o.status_changed_at < now() - interval '48 hours'");
    if (!tests) where.push("not o.is_test");
    return {
      rows: await tx.query<{ id: string; order_number: string; customer_name: string; governorate_name: string | null; city: string; status: string; payment_status: string; total: string; currency_code: string; created_at: string; is_test: boolean; suppliers: string | null; pending_proofs: number }>(
        `select o.id, o.order_number, o.customer_name, o.governorate_name, o.city, o.status, o.payment_status, o.total::text, o.currency_code,
                o.created_at::text, o.is_test,
                (select string_agg(distinct s.name, '، ') from public.fulfillment_records f join public.suppliers s on s.id = f.supplier_id where f.order_id = o.id) as suppliers,
                (select count(*)::int from public.payment_proofs pp where pp.order_id = o.id and pp.status = 'pending') as pending_proofs
         from public.orders o where ${where.join(" and ")} order by o.created_at desc limit 300`,
        params,
      ),
      suppliers: await tx.query<{ id: string; name: string }>("select id, name from public.suppliers order by name"),
    };
  });
  return (
    <>
      <AdminTitle title="الطلبات" description={`${rows.length} طلب`} />
      <form className="mb-4 grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-end">
        <Input name="q" defaultValue={q} placeholder="رقم الطلب، الاسم، الهاتف" className="col-span-2 md:max-w-xs" aria-label="بحث" />
        <Select name="status" defaultValue={status} className="md:w-auto" aria-label="حالة الطلب">
          <option value="">كل الحالات</option>
          {Object.entries(t.orderStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select name="payment" defaultValue={payment} className="md:w-auto" aria-label="حالة الدفع">
          <option value="">كل حالات الدفع</option>
          {Object.entries(t.paymentStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select name="supplier" defaultValue={supplier} className="md:w-auto" aria-label="المورد">
          <option value="">كل الموردين</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input name="from" type="date" defaultValue={from} aria-label="من تاريخ" className="md:w-auto" />
        <Input name="to" type="date" defaultValue={to} aria-label="إلى تاريخ" className="md:w-auto" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="late" value="1" defaultChecked={late} className="accent-ink" /> متأخرة</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tests" value="1" defaultChecked={tests} className="accent-ink" /> طلبات الاختبار</label>
        <button className="h-10 rounded-md border border-line bg-paper px-4 text-sm">تصفية</button>
        <Link href="/admin/orders" className="self-center text-sm text-muted underline">مسح</Link>
      </form>
      <Table head={["الطلب", "العميل", "المنطقة", "الحالة", "الدفع", "المورد", "الإجمالي", "التاريخ"]} empty={!rows.length}>
        {rows.map((o) => (
          <tr key={o.id}>
            <td className={td}>
              <Link href={`/admin/orders/${o.id}`} className="ltr font-mono font-semibold hover:underline">{o.order_number}</Link>
              {o.is_test && <span className="ms-2 text-xs text-warning">اختبار</span>}
              {o.pending_proofs > 0 && <div className="text-xs text-warning">إثبات بانتظار المراجعة</div>}
            </td>
            <td className={td}>{o.customer_name}</td>
            <td className={`${td} text-xs`}>{[o.governorate_name, o.city].filter(Boolean).join(" — ")}</td>
            <td className={td}><OrderStatusBadge status={o.status} /></td>
            <td className={`${td} text-xs`}>{label(t.paymentStatus, o.payment_status)}</td>
            <td className={`${td} text-xs`}>{o.suppliers ?? "—"}</td>
            <td className={td}>{formatMoney(o.total, o.currency_code)}</td>
            <td className={`${td} text-xs text-muted`}>{formatDate(o.created_at)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
