import Link from "next/link";
import type { OrderDetail } from "@/lib/data/orders";
import { formatMoney } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { Badge } from "@/components/ui/Badge";
import { ProductImage } from "@/components/product/ProductImage";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "dark"> = {
  pending: "warning",
  confirmed: "neutral",
  processing: "neutral",
  shipped: "dark",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
};

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label(t.orderStatus, status)}</Badge>;
}

export function formatDate(s: string) {
  return new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

export function OrderDetailView({ order, actions }: { order: OrderDetail; actions?: React.ReactNode }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="ltr font-mono text-xl font-bold md:text-2xl">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
        {order.is_test && <Badge tone="warning">طلب اختبار</Badge>}
      </div>
      <p className="-mt-6 text-sm text-muted">{formatDate(order.created_at)}</p>

      {order.status === "cancelled" && order.cancel_reason && (
        <p className="text-sm text-danger">سبب الإلغاء: {order.cancel_reason}</p>
      )}

      <section>
        <h2 className="mb-4 text-base font-bold">مراحل الطلب</h2>
        <ol className="relative space-y-5 border-s border-line ps-6">
          {order.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -start-[1.85rem] top-1.5 size-3 rounded-full border-2 border-ivory bg-beige-deep" aria-hidden />
              <p className="text-sm font-semibold">{e.status ? label(t.orderStatus, e.status) : "تحديث"}</p>
              {e.note && <p className="text-sm text-ink-soft">{e.note}</p>}
              <p className="text-xs text-muted">{formatDate(e.created_at)}</p>
            </li>
          ))}
        </ol>
      </section>

      {order.shipments.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <h2 className="mb-3 text-base font-bold">معلومات الشحن</h2>
          <ul className="space-y-2 text-sm">
            {order.shipments.map((s, i) => (
              <li key={i}>
                {s.carrier && <span className="text-muted">{s.carrier}: </span>}
                {s.tracking_url ? (
                  <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="ltr font-mono font-semibold underline">{s.tracking_number}</a>
                ) : (
                  <span className="ltr font-mono font-semibold">{s.tracking_number}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-base font-bold">المنتجات</h2>
        <ul className="divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 py-4">
              <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-[var(--radius-card)] bg-sand">
                <ProductImage src={i.image_url} alt="" sizes="64px" />
              </div>
              <div className="flex-1 text-sm">
                {i.product_slug ? <Link href={`/product/${i.product_slug}`} className="font-semibold hover:underline">{i.product_name}</Link> : <span className="font-semibold">{i.product_name}</span>}
                <p className="text-xs text-muted">{[i.variant_label, `${formatMoney(i.unit_price, order.currency_code)} × ${i.quantity}`].filter(Boolean).join(" · ")}</p>
              </div>
              <p className="text-sm font-semibold">{formatMoney(i.line_total, order.currency_code)}</p>
            </li>
          ))}
        </ul>
        <dl className="ms-auto mt-4 max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between"><dt className="text-muted">المجموع الفرعي</dt><dd>{formatMoney(order.subtotal, order.currency_code)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">الشحن</dt><dd>{formatMoney(order.shipping_cost, order.currency_code)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 font-bold"><dt>الإجمالي</dt><dd>{formatMoney(order.total, order.currency_code)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted">الدفع</dt><dd>{label(t.paymentStatus, order.payment_status)} · {order.payment_method === "cod" ? "عند الاستلام" : "طلب يدوي"}</dd></div>
        </dl>
      </section>

      <section className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <h2 className="mb-2 font-bold">عنوان التوصيل</h2>
          <p>{order.customer_name}</p>
          <p className="ltr text-end">{order.customer_phone}</p>
          <p className="text-ink-soft">{order.country_name} — {order.city}</p>
          <p className="text-ink-soft">{order.address_line}</p>
        </div>
        {order.estimated_min_days != null && (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
            <h2 className="mb-2 font-bold">التوصيل المتوقع</h2>
            <p>{order.estimated_min_days}–{order.estimated_max_days} يوم عمل بعد التأكيد (تقديري).</p>
          </div>
        )}
      </section>

      {order.returns.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">طلبات الإرجاع</h2>
          <ul className="space-y-2 text-sm">
            {order.returns.map((r) => (
              <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                <Badge>{label(t.returnStatus, r.status)}</Badge>
                <p className="mt-2 text-ink-soft">{r.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {actions}
    </div>
  );
}
