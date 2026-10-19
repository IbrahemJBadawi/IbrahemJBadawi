import Link from "next/link";
import { Building2, Clock, Info } from "lucide-react";
import type { OrderDetail } from "@/lib/data/orders";
import { formatMoney, fromMills, toMills } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/States";
import { ProductImage } from "@/components/product/ProductImage";

const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "dark"> = {
  new: "warning", under_review: "warning", awaiting_stock: "warning", awaiting_payment: "warning", payment_review: "warning",
  paid: "success", awaiting_supplier_payout: "neutral", supplier_paid: "neutral", processing: "neutral",
  shipped: "dark", delivered: "success", cancel_requested: "danger", cancelled: "danger",
  returned: "danger", refund_pending: "danger", refunded: "neutral",
};

export function OrderStatusBadge({ status, customer = false }: { status: string; customer?: boolean }) {
  return <Badge tone={STATUS_TONE[status] ?? "neutral"}>{label(customer ? t.customerStatus : t.orderStatus, status)}</Badge>;
}

export function formatDate(s: string) {
  return new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(s));
}

function Row({ k, v, strong }: { k: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "border-t border-line pt-2 text-base font-bold" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}

/** Bank-transfer box: only rendered when the price is approved and payment is expected. */
function PaymentBox({ order }: { order: OrderDetail }) {
  const p = order.payment;
  if (!p) return null;
  const remaining = fromMills(Math.max(0, toMills(order.total) - toMills(order.amount_collected)));
  const configured = p.enabled && (p.transfer_details || p.beneficiary_name || p.instructions);
  return (
    <section className="rounded-[var(--radius-card)] border-2 border-ink/80 bg-paper p-5">
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold"><Building2 className="size-5" /> تعليمات التحويل البنكي</h2>
      <p className="text-sm">
        المبلغ المطلوب تحويله: <strong className="text-lg">{formatMoney(remaining, order.currency_code)}</strong>
      </p>
      {order.payment_due_at && (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock className="size-3.5" /> صالحة حتى {formatDate(order.payment_due_at)}</p>
      )}
      {configured ? (
        <dl className="mt-4 space-y-2 text-sm">
          {p.beneficiary_name && <Row k="اسم المستفيد" v={p.beneficiary_name} />}
          {p.bank_name && <Row k="البنك" v={p.bank_name} />}
          {p.transfer_details && (
            <div>
              <dt className="text-muted">تفاصيل التحويل</dt>
              <dd className="ltr mt-1 whitespace-pre-line rounded-md bg-sand/60 p-3 text-start font-mono text-sm [overflow-wrap:anywhere]">{p.transfer_details}</dd>
            </div>
          )}
          {p.instructions && <p className="whitespace-pre-line leading-7 text-ink-soft">{p.instructions}</p>}
          <p className="text-ink-soft">اكتب رقم الطلب <strong className="ltr font-mono">{order.order_number}</strong> في ملاحظة التحويل.</p>
          {p.proof_review_policy && <p className="text-xs leading-6 text-muted">{p.proof_review_policy}</p>}
          {p.contact && <p className="text-xs text-muted">للاستفسار: <span className="ltr">{p.contact}</span></p>}
        </dl>
      ) : (
        <Notice tone="warning">بيانات التحويل لم تُنشر بعد. سنتواصل معك على رقم هاتفك بتعليمات الدفع — لا تحوّل لأي حساب لم يظهر هنا أو لم نرسله لك نحن.</Notice>
      )}
    </section>
  );
}

export function OrderDetailView({ order, actions }: { order: OrderDetail; actions?: React.ReactNode }) {
  const approved = !!order.price_approved_at;
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="ltr font-mono text-xl font-bold md:text-2xl">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} customer />
        {order.is_test && <Badge tone="warning">طلب اختبار</Badge>}
      </div>
      <p className="-mt-6 text-sm text-muted">{formatDate(order.created_at)} · الدفع: {label(t.paymentStatus, order.payment_status)}</p>

      {!approved && !["cancelled", "cancel_requested"].includes(order.status) && (
        <Notice>
          <span className="flex gap-2"><Info className="mt-1 size-4 shrink-0" /> لا تحوّل أي مبلغ الآن. نتأكد من توفر المنتجات لدى المورد ثم نعتمد السعر النهائي ونعرض لك تعليمات الدفع هنا.</span>
        </Notice>
      )}
      {order.status === "payment_review" && (
        <Notice>استلمنا إثبات التحويل. يُعتبر الطلب مدفوعًا فقط بعد تحققنا من وصول المبلغ فعليًا إلى الحساب.</Notice>
      )}
      {order.status === "cancelled" && order.cancel_reason && <p className="text-sm text-danger">سبب الإلغاء: {order.cancel_reason}</p>}

      <PaymentBox order={order} />

      <section>
        <h2 className="mb-4 text-base font-bold">المنتجات والتكلفة</h2>
        <ul className="divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.id} className="flex gap-4 py-4">
              <div className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-sand">
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
        <dl className="ms-auto mt-4 max-w-sm space-y-1.5 text-sm">
          <Row k="المنتجات" v={formatMoney(order.subtotal, order.currency_code)} />
          {toMills(order.discount_total) > 0 && <Row k="الخصم" v={`− ${formatMoney(order.discount_total, order.currency_code)}`} />}
          <Row k={approved ? "رسوم التوصيل" : "رسوم التوصيل (تقديرية)"} v={formatMoney(order.shipping_cost, order.currency_code)} />
          {toMills(order.fees_total) > 0 && <Row k={order.fees_label || "رسوم معلنة"} v={formatMoney(order.fees_total, order.currency_code)} />}
          <Row k={approved ? "الإجمالي النهائي المعتمد" : "الإجمالي التقديري"} v={formatMoney(order.total, order.currency_code)} strong />
          {toMills(order.amount_collected) > 0 && <Row k="المبلغ المؤكد وصوله" v={formatMoney(order.amount_collected, order.currency_code)} />}
        </dl>
      </section>

      {order.proofs.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">إثباتات التحويل</h2>
          <ul className="space-y-2 text-sm">
            {order.proofs.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-line bg-paper p-3">
                <span>{formatMoney(p.declared_amount, order.currency_code)} · <span className="text-xs text-muted">{formatDate(p.created_at)}</span></span>
                <Badge tone={p.status === "accepted" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{label(t.proofStatus, p.status)}</Badge>
                {p.rejection_reason && <p className="w-full text-xs text-danger">سبب الرفض: {p.rejection_reason}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {order.refunds.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">الاستردادات</h2>
          <ul className="space-y-2 text-sm">
            {order.refunds.map((r) => (
              <li key={r.id} className="rounded-[var(--radius-control)] border border-line bg-paper p-3">
                {formatMoney(r.amount, order.currency_code)} — <Badge tone={r.status === "completed" ? "success" : "warning"}>{label(t.refundStatus, r.status)}</Badge>
                <p className="mt-1 text-xs text-muted">{r.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-base font-bold">مراحل الطلب</h2>
        <ol className="relative space-y-5 border-s border-line ps-6">
          {order.events.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -start-[1.85rem] top-1.5 size-3 rounded-full border-2 border-ivory bg-beige-deep" aria-hidden />
              <p className="text-sm font-semibold">{e.status ? label(t.customerStatus, e.status) : "تحديث"}</p>
              {e.note && <p className="text-sm text-ink-soft">{e.note}</p>}
              <p className="text-xs text-muted">{formatDate(e.created_at)}</p>
            </li>
          ))}
        </ol>
      </section>

      {order.shipments.length > 0 && (
        <section className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <h2 className="mb-3 text-base font-bold">التوصيل</h2>
          <ul className="space-y-2 text-sm">
            {order.shipments.map((s, i) => (
              <li key={i}>
                {s.carrier && <span className="text-muted">{s.carrier}{s.tracking_number ? ": " : ""}</span>}
                {s.tracking_number && (s.tracking_url ? (
                  <a href={s.tracking_url} target="_blank" rel="noopener noreferrer" className="ltr font-mono font-semibold underline">{s.tracking_number}</a>
                ) : (
                  <span className="ltr font-mono font-semibold">{s.tracking_number}</span>
                ))}
                <span className="ms-2 text-xs text-muted">({label(t.fulfillmentStatus, s.status)})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="grid gap-4 text-sm sm:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
          <h2 className="mb-2 font-bold">عنوان التوصيل</h2>
          <p>{order.customer_name}</p>
          <p className="ltr text-end">{order.customer_phone}</p>
          <p className="text-ink-soft">{[order.country_name, order.governorate_name, order.city].filter(Boolean).join(" — ")}</p>
          <p className="text-ink-soft">{order.address_line}</p>
        </div>
        {order.estimated_min_days != null && (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-5">
            <h2 className="mb-2 font-bold">التوصيل المتوقع</h2>
            <p>{order.estimated_min_days}–{order.estimated_max_days} يوم عمل بعد تأكيد الدفع (تقديري).</p>
          </div>
        )}
      </section>

      {order.returns.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold">طلبات الإرجاع والاستبدال</h2>
          <ul className="space-y-2 text-sm">
            {order.returns.map((r) => (
              <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
                <Badge>{label(t.returnKind, r.kind)}</Badge> <Badge>{label(t.returnStatus, r.status)}</Badge>
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
