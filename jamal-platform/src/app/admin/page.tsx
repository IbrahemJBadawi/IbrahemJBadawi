import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { withAdmin } from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { computeFinancials } from "@/lib/finance";
import { AdminTitle, Card, Stat, Table, td } from "@/components/admin/ui";
import { OrderStatusBadge, formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "الملخص" };

type FinRow = {
  id: string; currency_code: string; subtotal: string; discount_total: string; shipping_cost: string; fees_total: string; total: string;
  amount_collected: string; expected_shipping_cost: string | null; status: string;
  fulfillments: { status: string; cost_currency: string | null; expected_cost: string | null; actual_cost: string | null; actual_shipping_cost: string | null; shipping_paid_to: "supplier" | "courier" | "none"; settlement_status: string; settlement_paid_amount: string | null; supplier_refund_amount: string | null; supplier_refund_status: string }[] | null;
  expenses: { kind: string; amount: string; currency_code: string }[] | null;
  refunds: { amount: string; status: string }[] | null;
};

export default async function AdminDashboard() {
  const data = await withAdmin(async (tx) => {
    const byStatus = await tx.query<{ status: string; n: number }>(
      "select status, count(*)::int as n from public.orders where not is_test group by status",
    );
    const [counts] = await tx.query<{
      proofs: number; settlements_due: number; zones: number; messages: number; returns: number; refunds_pending: number;
      stale_stock: number; late: number; no_supplier: number; demo_products: number; payment_configured: boolean;
    }>(
      `select
        (select count(*)::int from public.payment_proofs pp join public.orders o on o.id = pp.order_id where pp.status = 'pending' and not o.is_test) as proofs,
        (select count(*)::int from public.fulfillment_records f join public.orders o on o.id = f.order_id where f.settlement_status in ('due','awaiting_transfer') and not o.is_test) as settlements_due,
        (select count(*)::int from public.shipping_zones z where z.is_active) as zones,
        (select count(*)::int from public.contact_messages where status = 'new') as messages,
        (select count(*)::int from public.return_requests where status = 'requested') as returns,
        (select count(*)::int from public.refunds where status = 'pending') as refunds_pending,
        (select count(*)::int from public.products p where p.status = 'published' and not p.is_demo and (p.stock_confirmed_at is null or p.stock_confirmed_at < now() - interval '7 days')) as stale_stock,
        (select count(*)::int from public.orders o where not o.is_test and o.status not in ('delivered','cancelled','refunded','returned') and o.status_changed_at < now() - interval '48 hours') as late,
        (select count(*)::int from public.products p where p.status = 'published' and not exists (select 1 from public.supplier_products s where s.product_id = p.id and s.is_primary)) as no_supplier,
        (select count(*)::int from public.products where is_demo) as demo_products,
        (select bank_transfer_enabled and (transfer_details is not null or beneficiary_name is not null) from public.payment_settings where id = 1) as payment_configured`,
    );
    const finRows = await tx.query<FinRow>(
      `select o.id, o.currency_code, o.subtotal::text, o.discount_total::text, o.shipping_cost::text, o.fees_total::text, o.total::text,
              o.amount_collected::text, o.expected_shipping_cost::text, o.status,
              (select json_agg(json_build_object('status', f.status, 'cost_currency', f.cost_currency, 'expected_cost', f.expected_cost::text,
                 'actual_cost', f.actual_cost::text, 'actual_shipping_cost', f.actual_shipping_cost::text, 'shipping_paid_to', f.shipping_paid_to,
                 'settlement_status', f.settlement_status, 'settlement_paid_amount', f.settlement_paid_amount::text,
                 'supplier_refund_amount', f.supplier_refund_amount::text, 'supplier_refund_status', f.supplier_refund_status))
                 from public.fulfillment_records f where f.order_id = o.id) as fulfillments,
              (select json_agg(json_build_object('kind', e.kind, 'amount', e.amount::text, 'currency_code', e.currency_code)) from public.order_expenses e where e.order_id = o.id) as expenses,
              (select json_agg(json_build_object('amount', r.amount::text, 'status', r.status)) from public.refunds r where r.order_id = o.id) as refunds
       from public.orders o where not o.is_test and o.status <> 'cancelled' and o.price_approved_at is not null`,
    );
    const recent = await tx.query<{ id: string; order_number: string; customer_name: string; status: string; total: string; currency_code: string; created_at: string; is_test: boolean }>(
      "select id, order_number, customer_name, status, total::text, currency_code, created_at::text, is_test from public.orders order by created_at desc limit 8",
    );
    return { byStatus, counts, finRows, recent };
  });

  const count = (...s: string[]) => s.reduce((n, x) => n + (data.byStatus.find((r) => r.status === x)?.n ?? 0), 0);
  // Money per currency (never summed across currencies).
  const totals = new Map<string, { collected: number; expectedRevenue: number; supplierDue: number; transferred: number; expenses: number; expectedProfit: number; actualProfit: number; actualCount: number }>();
  for (const r of data.finRows) {
    const fin = computeFinancials(
      { currency: r.currency_code, subtotal: r.subtotal, discount: r.discount_total, shippingFee: r.shipping_cost, fees: r.fees_total, total: r.total, amountCollected: r.amount_collected, expectedShippingCost: r.expected_shipping_cost },
      (r.fulfillments ?? []).map((f) => ({ status: f.status, costCurrency: f.cost_currency, expectedCost: f.expected_cost, actualCost: f.actual_cost, actualShippingCost: f.actual_shipping_cost, shippingPaidTo: f.shipping_paid_to, settlementStatus: f.settlement_status, settlementPaidAmount: f.settlement_paid_amount, supplierRefundAmount: f.supplier_refund_amount, supplierRefundStatus: f.supplier_refund_status })),
      (r.expenses ?? []).map((e) => ({ kind: e.kind, amount: e.amount, currency: e.currency_code })),
      (r.refunds ?? []).map((x) => ({ amount: x.amount, status: x.status, currency: r.currency_code })),
    );
    const t0 = totals.get(r.currency_code) ?? { collected: 0, expectedRevenue: 0, supplierDue: 0, transferred: 0, expenses: 0, expectedProfit: 0, actualProfit: 0, actualCount: 0 };
    t0.collected += Number(fin.netCollected);
    t0.expectedRevenue += Number(fin.expectedRevenue);
    t0.supplierDue += Number(fin.supplierDue ?? 0);
    t0.transferred += Number(fin.supplierTransferred);
    t0.expenses += Number(fin.expenses) + Number(fin.shippingCost ?? 0);
    t0.expectedProfit += Number(fin.expectedProfit ?? 0);
    if (fin.actualProfit !== null) {
      t0.actualProfit += Number(fin.actualProfit);
      t0.actualCount += 1;
    }
    totals.set(r.currency_code, t0);
  }

  const c = data.counts;
  const warnings = [
    !c.payment_configured && { text: "بيانات التحويل البنكي غير مُدخلة — لن تظهر للعملاء تعليمات الدفع.", href: "/admin/settings" },
    c.zones === 0 && { text: "لا توجد منطقة توصيل مفعّلة — لن يتمكن العملاء من الطلب.", href: "/admin/shipping" },
    c.proofs > 0 && { text: `${c.proofs} إثبات تحويل بانتظار المراجعة.`, href: "/admin/orders?status=payment_review" },
    c.settlements_due > 0 && { text: `${c.settlements_due} مستحقات موردين بانتظار التحويل.`, href: "/admin/settlements" },
    c.refunds_pending > 0 && { text: `${c.refunds_pending} استرداد معلّق لم يُنفّذ بعد.`, href: "/admin/orders?status=refund_pending" },
    c.late > 0 && { text: `${c.late} طلب لم تتغير حالته منذ أكثر من 48 ساعة.`, href: "/admin/orders?late=1" },
    c.stale_stock > 0 && { text: `${c.stale_stock} منتج منشور لم يُؤكد توفره وسعره منذ أكثر من 7 أيام.`, href: "/admin/products?issue=stale" },
    c.returns > 0 && { text: `${c.returns} طلب إرجاع جديد.`, href: "/admin/returns" },
    c.no_supplier > 0 && { text: `${c.no_supplier} منتج منشور بدون مورد أساسي.`, href: "/admin/products?issue=supplier" },
    c.messages > 0 && { text: `${c.messages} رسالة تواصل جديدة.`, href: "/admin/messages" },
    c.demo_products > 0 && { text: `يوجد ${c.demo_products} منتج تجريبي — احذفها قبل الإطلاق بأمر حذف البيانات التجريبية (راجع README).`, href: "/admin/products?issue=demo" },
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <div className="space-y-6">
      <AdminTitle title="الملخص" description="الأرقام تستثني طلبات الاختبار. لا يتم جمع عملات مختلفة معًا." />
      {warnings.length > 0 && (
        <Card title="يحتاج إلى انتباه">
          <ul className="space-y-2">
            {warnings.map((w) => (
              <li key={w.text}><Link href={w.href} className="flex items-start gap-2 text-sm hover:underline"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> {w.text}</Link></li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="طلبات جديدة / قيد المراجعة" value={count("new", "under_review")} href="/admin/orders?status=new" />
        <Stat label="بانتظار تأكيد المخزون" value={count("awaiting_stock")} href="/admin/orders?status=awaiting_stock" />
        <Stat label="بانتظار التحويل" value={count("awaiting_payment")} href="/admin/orders?status=awaiting_payment" />
        <Stat label="تحويلات قيد المراجعة" value={count("payment_review")} hint={`${c.proofs} إثبات`} href="/admin/orders?status=payment_review" />
        <Stat label="مدفوعة" value={count("paid")} href="/admin/orders?status=paid" />
        <Stat label="بانتظار المورد" value={count("awaiting_supplier_payout", "supplier_paid")} href="/admin/orders?status=awaiting_supplier_payout" />
        <Stat label="قيد التجهيز" value={count("processing")} href="/admin/orders?status=processing" />
        <Stat label="شحنات حالية" value={count("shipped")} href="/admin/orders?status=shipped" />
        <Stat label="مسلّمة" value={count("delivered")} href="/admin/orders?status=delivered" />
        <Stat label="ملغاة" value={count("cancelled", "cancel_requested")} href="/admin/orders?status=cancelled" />
        <Stat label="مرتجعة / استرداد" value={count("returned", "refund_pending", "refunded")} href="/admin/orders?status=returned" />
        <Stat label="مستحقات موردين" value={c.settlements_due} href="/admin/settlements" />
      </div>
      <Card title="المال حسب العملة (طلبات معتمدة السعر)">
        {totals.size === 0 ? (
          <p className="text-sm text-muted">لا توجد طلبات حقيقية معتمدة السعر بعد.</p>
        ) : (
          <div className="space-y-4">
            {[...totals.entries()].map(([cur, v]) => (
              <dl key={cur} className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                <p className="col-span-full font-bold">{cur}</p>
                <div><dt className="text-xs text-muted">الإيراد المتوقع</dt><dd>{formatMoney(v.expectedRevenue, cur)}</dd></div>
                <div><dt className="text-xs text-muted">المحصّل (صافي)</dt><dd className="font-semibold">{formatMoney(v.collected, cur)}</dd></div>
                <div><dt className="text-xs text-muted">مستحق للموردين</dt><dd>{formatMoney(v.supplierDue, cur)}</dd></div>
                <div><dt className="text-xs text-muted">حُوّل للموردين</dt><dd>{formatMoney(v.transferred, cur)}</dd></div>
                <div><dt className="text-xs text-muted">مصروفات (توصيل + رسوم)</dt><dd>{formatMoney(v.expenses, cur)}</dd></div>
                <div><dt className="text-xs text-muted">الربح المتوقع</dt><dd>{formatMoney(v.expectedProfit, cur)}</dd></div>
                <div><dt className="text-xs text-muted">الربح الفعلي ({v.actualCount} طلب مكتمل التكاليف)</dt><dd className={v.actualProfit < 0 ? "font-semibold text-danger" : "font-semibold text-success"}>{formatMoney(v.actualProfit, cur)}</dd></div>
              </dl>
            ))}
          </div>
        )}
      </Card>
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
      <p className="text-xs text-muted">حالات الدفع: {Object.values(t.paymentStatus).join(" · ")} — {label(t.paymentMethod, "bank_transfer")} يُؤكد يدويًا بعد التحقق من كشف الحساب.</p>
    </div>
  );
}
