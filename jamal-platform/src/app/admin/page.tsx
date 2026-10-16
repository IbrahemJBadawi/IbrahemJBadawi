import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { withAdmin } from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Card, Stat, Table, td } from "@/components/admin/ui";
import { OrderStatusBadge, formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "الملخص" };

export default async function AdminDashboard() {
  const data = await withAdmin(async (tx) => {
    const byStatus = await tx.query<{ status: string; n: number }>(
      "select status, count(*)::int as n from public.orders where not is_test group by status",
    );
    // Sales per currency — never summed across currencies.
    const sales = await tx.query<{ currency_code: string; orders: number; gross: string; delivered: string }>(
      `select currency_code, count(*)::int as orders, sum(total)::text as gross,
              coalesce(sum(total) filter (where status = 'delivered'), 0)::text as delivered
       from public.orders where not is_test and status not in ('cancelled') group by currency_code order by currency_code`,
    );
    // Realised profit: delivered orders whose fulfillment costs are all recorded in the sale currency.
    const profit = await tx.query<{ currency_code: string; orders: number; revenue: string; cost: string }>(
      `select o.currency_code, count(*)::int as orders, sum(o.total - coalesce(r.refunded,0))::text as revenue, sum(c.cost)::text as cost
       from public.orders o
       join lateral (
         select sum(coalesce(f.actual_cost,0) + coalesce(f.actual_shipping_cost,0)) as cost,
                bool_and(f.actual_cost is not null and f.cost_currency = o.currency_code) as complete
         from public.fulfillment_records f where f.order_id = o.id and f.status <> 'cancelled'
       ) c on c.complete
       left join lateral (select sum(refund_amount) as refunded from public.return_requests rr where rr.order_id = o.id and rr.status = 'refunded') r on true
       where not o.is_test and o.status = 'delivered'
       group by o.currency_code`,
    );
    const [alerts] = await tx.query<{
      no_supplier: number; no_images: number; zones: number; messages: number; returns: number; pending: number; unsent: number; test_orders: number; demo_products: number;
    }>(
      `select
        (select count(*)::int from public.products p where p.status = 'published' and not exists (select 1 from public.supplier_products s where s.product_id = p.id and s.is_primary)) as no_supplier,
        (select count(*)::int from public.products p where p.status = 'published' and jsonb_array_length(p.images) = 0) as no_images,
        (select count(*)::int from public.shipping_zones z where z.is_active) as zones,
        (select count(*)::int from public.contact_messages where status = 'new') as messages,
        (select count(*)::int from public.return_requests where status = 'requested') as returns,
        (select count(*)::int from public.orders where status = 'pending' and not is_test) as pending,
        (select count(*)::int from public.fulfillment_records f join public.orders o on o.id = f.order_id
           where f.status = 'pending' and o.status in ('confirmed','processing')) as unsent,
        (select count(*)::int from public.orders where is_test) as test_orders,
        (select count(*)::int from public.products where is_demo) as demo_products`,
    );
    const recent = await tx.query<{ id: string; order_number: string; customer_name: string; status: string; total: string; currency_code: string; created_at: string; is_test: boolean }>(
      "select id, order_number, customer_name, status, total::text, currency_code, created_at::text, is_test from public.orders order by created_at desc limit 8",
    );
    return { byStatus, sales, profit, alerts, recent };
  });

  const count = (s: string) => data.byStatus.find((x) => x.status === s)?.n ?? 0;
  const a = data.alerts;
  const warnings = [
    a.zones === 0 && { text: "لا توجد منطقة شحن مفعّلة — لن يتمكن العملاء من إتمام الطلب.", href: "/admin/shipping" },
    a.pending > 0 && { text: `${a.pending} طلب بانتظار المراجعة والتأكيد.`, href: "/admin/orders?status=pending" },
    a.unsent > 0 && { text: `${a.unsent} سجل تنفيذ لطلبات مؤكدة لم يُرسل للمورد بعد.`, href: "/admin/orders?status=confirmed" },
    a.returns > 0 && { text: `${a.returns} طلب إرجاع جديد.`, href: "/admin/returns" },
    a.no_supplier > 0 && { text: `${a.no_supplier} منتج منشور بدون مورد أساسي (لن يُحسب الربح ولن يُتاح الدفع عند الاستلام).`, href: "/admin/products?issue=supplier" },
    a.no_images > 0 && { text: `${a.no_images} منتج منشور بدون صور.`, href: "/admin/products?issue=images" },
    a.messages > 0 && { text: `${a.messages} رسالة تواصل جديدة.`, href: "/admin/messages" },
    a.demo_products > 0 && { text: `يوجد ${a.demo_products} منتج تجريبي في المتجر. احذفها قبل الإطلاق (npm run seed:demo -- --remove).`, href: "/admin/products?issue=demo" },
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <div className="space-y-6">
      <AdminTitle title="الملخص" description="الأرقام تستثني طلبات الاختبار (التي تحتوي منتجات تجريبية)." />
      {warnings.length > 0 && (
        <Card title="يحتاج إلى انتباه">
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.text}>
                <Link href={w.href} className="flex items-start gap-2 text-sm hover:underline">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {w.text}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t.orderStatus.pending} value={count("pending")} href="/admin/orders?status=pending" />
        <Stat label={t.orderStatus.confirmed} value={count("confirmed") + count("processing")} hint="مؤكد + قيد التجهيز" href="/admin/orders?status=confirmed" />
        <Stat label={t.orderStatus.shipped} value={count("shipped")} href="/admin/orders?status=shipped" />
        <Stat label={t.orderStatus.delivered} value={count("delivered")} href="/admin/orders?status=delivered" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Card title="المبيعات حسب العملة">
          {data.sales.length === 0 ? (
            <p className="text-sm text-muted">لا توجد طلبات حقيقية بعد.{a.test_orders > 0 && ` (${a.test_orders} طلب اختبار مستثنى)`}</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.sales.map((s) => (
                <li key={s.currency_code} className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold">{s.currency_code} · {s.orders} طلب</span>
                  <span>قيمة الطلبات غير الملغاة: <strong>{formatMoney(s.gross, s.currency_code)}</strong></span>
                  <span className="w-full text-muted">المسلّمة: {formatMoney(s.delivered, s.currency_code)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="الربح الفعلي (طلبات مُسلّمة مكتملة التكاليف)">
          {data.profit.length === 0 ? (
            <p className="text-sm leading-7 text-muted">يظهر الربح بعد تسليم الطلبات وتسجيل التكلفة الفعلية لكل سجل تنفيذ بنفس عملة البيع. لا يتم تحويل العملات.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {data.profit.map((p) => (
                <li key={p.currency_code} className="flex flex-wrap justify-between gap-2">
                  <span className="font-semibold">{p.currency_code} · {p.orders} طلب</span>
                  <span>الإيراد {formatMoney(p.revenue, p.currency_code)} − التكلفة {formatMoney(p.cost, p.currency_code)}</span>
                  <strong className={Number(p.revenue) - Number(p.cost) >= 0 ? "text-success" : "text-danger"}>
                    = {formatMoney(Number(p.revenue) - Number(p.cost), p.currency_code)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card title="أحدث الطلبات" action={<Link href="/admin/orders" className="text-sm text-beige-deep hover:underline">عرض الكل</Link>}>
        <Table head={["الطلب", "العميل", "الحالة", "الإجمالي", "التاريخ"]} empty={data.recent.length === 0}>
          {data.recent.map((o) => (
            <tr key={o.id}>
              <td className={td}><Link href={`/admin/orders/${o.id}`} className="ltr font-mono font-semibold hover:underline">{o.order_number}</Link>{o.is_test && <span className="ms-2 text-xs text-warning">اختبار</span>}</td>
              <td className={td}>{o.customer_name}</td>
              <td className={td}><OrderStatusBadge status={o.status} /></td>
              <td className={td}>{formatMoney(o.total, o.currency_code)}</td>
              <td className={`${td} text-muted`}>{formatDate(o.created_at)}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <p className="text-xs text-muted">حالات الدفع: {Object.values(t.paymentStatus).join(" · ")} — {label(t.paymentMethod, "cod")} يُسجل كمدفوع يدويًا بعد التحصيل.</p>
    </div>
  );
}
