import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { withAdmin } from "@/lib/admin";
import { addOrderNoteAction } from "@/lib/actions/admin/operations";
import {
  addExpenseAction, approvePriceAction, cancelOrderAction, cancelRefundAction, completeRefundAction, confirmStockAction,
  createRefundAction, decideCancelAction, recordPaymentAction, reviewProofAction, transitionAction, updateFulfillmentAction,
  updateReturnAction, updateSettlementAction,
} from "@/lib/actions/admin/workflow";
import { MANUAL_TRANSITIONS, PRE_APPROVAL, TERMINAL } from "@/lib/orders/states";
import { computeFinancials } from "@/lib/finance";
import { formatMoney, fromMills, toMills } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Card } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/CopyButton";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/States";
import { OrderStatusBadge, formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "تفاصيل الطلب" };

type Order = {
  id: string; order_number: string; user_id: string | null; customer_name: string; customer_phone: string; country_name: string;
  governorate_name: string | null; city: string; address_line: string; customer_notes: string | null; currency_code: string;
  subtotal: string; discount_total: string; shipping_cost: string; fees_total: string; fees_label: string | null; total: string;
  amount_collected: string; expected_shipping_cost: string | null; payment_method: string; payment_status: string; status: string;
  is_test: boolean; cancel_reason: string | null; cancelled_by: string | null; cancel_cost_party: string | null; non_refundable_amount: string;
  created_at: string; estimated_min_days: number | null; estimated_max_days: number | null; price_approved_at: string | null;
  payment_due_at: string | null; payment_verified_at: string | null; payment_reference: string | null; status_before_cancel: string | null;
};
type Item = {
  id: string; product_id: string | null; product_name: string; variant_label: string | null; sku: string | null; unit_price: string; quantity: number;
  line_total: string; stock_status: string; stock_confirmed_at: string | null; stock_note: string | null; fulfillment_id: string | null;
  supplier_sku: string | null; supplier_url: string | null; unit_cost: string | null; unit_shipping_cost: string | null; cost_currency: string | null;
};
type Fulfillment = {
  id: string; supplier_id: string | null; supplier_name: string | null; supplier_contact: string | null; status: string; supplier_order_ref: string | null;
  carrier: string | null; tracking_number: string | null; tracking_url: string | null; cost_currency: string | null; expected_cost: string | null;
  actual_cost: string | null; actual_shipping_cost: string | null; shipping_paid_to: "supplier" | "courier" | "none"; issue_reason: string | null;
  notes: string | null; sent_at: string | null; shipped_at: string | null; delivered_at: string | null; settlement_status: string;
  settlement_paid_amount: string | null; settlement_paid_at: string | null; settlement_reference: string | null; settlement_notes: string | null;
  settlement_by: string | null; supplier_refund_amount: string | null; supplier_refund_status: string;
};
type Proof = {
  id: string; declared_amount: string; customer_reference: string | null; customer_note: string | null; has_file: boolean; source: string; status: string;
  verified_amount: string | null; verified_reference: string | null; verified_at: string | null; rejection_reason: string | null; created_at: string; reviewer: string | null;
};
type Event = { id: string; from_status: string | null; status: string | null; note: string | null; visible_to_customer: boolean; created_at: string; actor: string | null };
type Return = { id: string; kind: string; status: string; reason: string; cost_party: string | null; admin_notes: string | null; created_at: string };
type Refund = { id: string; amount: string; status: string; reason: string; method: string | null; reference: string | null; completed_at: string | null; created_at: string };
type Expense = { id: string; kind: string; amount: string; currency_code: string; note: string | null; created_at: string };

const today = () => new Date().toISOString().slice(0, 10);

function supplierText(o: Order, items: Item[]) {
  const lines = items.map((i) => {
    const parts = [`- ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`];
    if (i.supplier_sku) parts.push(`  SKU: ${i.supplier_sku}`);
    if (i.supplier_url) parts.push(`  ${i.supplier_url}`);
    return parts.join("\n");
  });
  return [
    "طلب تنفيذ من Al JAMAL Store | متجر الجمال",
    `رقم الطلب: ${o.order_number}`,
    "",
    "المنتجات:",
    ...lines,
    "",
    "التوصيل مباشرة إلى العميل:",
    `الاسم: ${o.customer_name}`,
    `الهاتف: ${o.customer_phone}`,
    `المنطقة: ${[o.governorate_name, o.city].filter(Boolean).join(" — ")}`,
    `العنوان: ${o.address_line}`,
    o.customer_notes ? `ملاحظات التوصيل: ${o.customer_notes}` : null,
    "",
    "الدفع: تم تحصيله من العميل عبر المنصة — لا تحصيل عند التسليم.",
    "يرجى تأكيد قبول التنفيذ وإرسال اسم شركة التوصيل ورقم التتبع عند الشحن.",
  ].filter((l) => l !== null).join("\n");
}

const small = "h-9 py-1 text-sm";

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await withAdmin(async (tx) => {
    const [order] = await tx.query<Order>(
      `select o.id, o.order_number, o.user_id, o.customer_name, o.customer_phone, c.name_ar as country_name, o.governorate_name, o.city,
              o.address_line, o.customer_notes, o.currency_code, o.subtotal::text, o.discount_total::text, o.shipping_cost::text,
              o.fees_total::text, o.fees_label, o.total::text, o.amount_collected::text, o.expected_shipping_cost::text, o.payment_method,
              o.payment_status, o.status, o.is_test, o.cancel_reason, o.cancelled_by, o.cancel_cost_party, o.non_refundable_amount::text,
              o.created_at::text, o.estimated_min_days, o.estimated_max_days, o.price_approved_at::text, o.payment_due_at::text,
              o.payment_verified_at::text, o.payment_reference, o.status_before_cancel
       from public.orders o join public.countries c on c.code = o.country_code where o.id = $1`,
      [id],
    );
    if (!order) return null;
    const q = <T,>(sql: string) => tx.query<T>(sql, [id]);
    return {
      order,
      items: await q<Item>(
        `select i.id, i.product_id, i.product_name, i.variant_label, i.sku, i.unit_price::text, i.quantity, i.line_total::text, i.stock_status,
                i.stock_confirmed_at::text, i.stock_note, c.fulfillment_id, c.supplier_sku, c.supplier_url, c.unit_cost::text,
                c.unit_shipping_cost::text, c.cost_currency
         from public.order_items i left join public.order_item_costs c on c.order_item_id = i.id where i.order_id = $1 order by i.product_name`),
      fulfillments: await q<Fulfillment>(
        `select f.id, f.supplier_id, s.name as supplier_name, coalesce(s.whatsapp, s.phone, s.email) as supplier_contact, f.status,
                f.supplier_order_ref, f.carrier, f.tracking_number, f.tracking_url, f.cost_currency, f.expected_cost::text, f.actual_cost::text,
                f.actual_shipping_cost::text, f.shipping_paid_to, f.issue_reason, f.notes, f.sent_at::text, f.shipped_at::text, f.delivered_at::text,
                f.settlement_status, f.settlement_paid_amount::text, f.settlement_paid_at::text, f.settlement_reference, f.settlement_notes,
                p.email as settlement_by, f.supplier_refund_amount::text, f.supplier_refund_status
         from public.fulfillment_records f left join public.suppliers s on s.id = f.supplier_id
         left join public.profiles p on p.id = f.settlement_recorded_by where f.order_id = $1 order by f.created_at`),
      proofs: await q<Proof>(
        `select pp.id, pp.declared_amount::text, pp.customer_reference, pp.customer_note, pp.has_file, pp.source, pp.status, pp.verified_amount::text,
                pp.verified_reference, pp.verified_at::text, pp.rejection_reason, pp.created_at::text, p.email as reviewer
         from public.payment_proofs pp left join public.profiles p on p.id = pp.reviewed_by where pp.order_id = $1 order by pp.created_at`),
      events: await q<Event>(
        `select e.id, e.from_status, e.status, e.note, e.visible_to_customer, e.created_at::text, p.email as actor
         from public.order_events e left join public.profiles p on p.id = e.actor_id where e.order_id = $1 order by e.created_at`),
      returns: await q<Return>("select id, kind, status, reason, cost_party, admin_notes, created_at::text from public.return_requests where order_id = $1 order by created_at"),
      refunds: await q<Refund>("select id, amount::text, status, reason, method, reference, completed_at::text, created_at::text from public.refunds where order_id = $1 order by created_at"),
      refundAccounts: await q<{ id: string; holder_name: string; method_label: string; account_ref: string; created_at: string }>(
        "select id, holder_name, method_label, account_ref, created_at::text from public.refund_accounts where order_id = $1 order by created_at desc"),
      invoice: (await q<{ invoice_no: string; status: string }>("select invoice_no, status from public.invoices where order_id = $1"))[0] ?? null,
      expenses: await q<Expense>("select id, kind, amount::text, currency_code, note, created_at::text from public.order_expenses where order_id = $1 order by created_at"),
      suppliers: await tx.query<{ id: string; name: string }>("select id, name from public.suppliers order by name"),
      currencies: await tx.query<{ code: string }>("select code from public.currencies where is_active order by code"),
    };
  });
  if (!data) notFound();
  const { order: o, items, fulfillments, proofs, events, returns, refunds, expenses, suppliers, currencies, refundAccounts, invoice } = data;
  const cur = o.currency_code;
  const preApproval = PRE_APPROVAL.includes(o.status);
  const paid = o.payment_status === "paid";
  const allAvailable = items.every((i) => i.stock_status === "available");
  const next = MANUAL_TRANSITIONS[o.status] ?? [];
  const fin = computeFinancials(
    {
      currency: cur, subtotal: o.subtotal, discount: o.discount_total, shippingFee: o.shipping_cost, fees: o.fees_total, total: o.total,
      amountCollected: o.amount_collected, expectedShippingCost: o.expected_shipping_cost,
    },
    fulfillments.map((f) => ({
      status: f.status, costCurrency: f.cost_currency, expectedCost: f.expected_cost, actualCost: f.actual_cost, actualShippingCost: f.actual_shipping_cost,
      shippingPaidTo: f.shipping_paid_to, settlementStatus: f.settlement_status, settlementPaidAmount: f.settlement_paid_amount,
      supplierRefundAmount: f.supplier_refund_amount, supplierRefundStatus: f.supplier_refund_status,
    })),
    expenses.map((e) => ({ kind: e.kind, amount: e.amount, currency: e.currency_code })),
    refunds.map((r) => ({ amount: r.amount, currency: cur, status: r.status })),
  );
  const remaining = fromMills(Math.max(0, toMills(o.total) - toMills(o.amount_collected)));
  const m = (v: string | null) => (v === null ? <span className="text-xs text-muted">غير مكتمل</span> : formatMoney(v, cur));

  return (
    <div className="space-y-6">
      <AdminTitle
        title={o.order_number}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={o.status} />
            <Badge tone={paid ? "success" : "warning"}>الدفع: {label(t.paymentStatus, o.payment_status)}</Badge>
            <span>{label(t.paymentMethod, o.payment_method)} · {formatDate(o.created_at)}</span>
            {o.is_test && <Badge tone="warning">طلب اختبار — مستثنى من المبيعات</Badge>}
            {invoice && <Link href={`/admin/invoices/${o.id}`} className="text-xs underline">فاتورة {invoice.invoice_no}</Link>}
          </span>
        }
        action={<Link href="/admin/orders" className="text-sm text-muted hover:underline">كل الطلبات</Link>}
      />

      {preApproval && <Notice tone="warning">الخطوة التالية: تواصل مع المورد وأكّد توفر كل منتج وسعره، ثم اعتمد السعر النهائي ليظهر للعميل مع تعليمات التحويل.</Notice>}
      {o.status === "payment_review" && <Notice tone="warning">يوجد إثبات تحويل بانتظار المراجعة. لا تقبله قبل التأكد من وصول المبلغ فعليًا إلى الحساب.</Notice>}
      {o.status === "cancel_requested" && <Notice tone="error">العميل طلب إلغاء الطلب (الحالة السابقة: {label(t.orderStatus, o.status_before_cancel)}). {o.cancel_reason && `السبب: ${o.cancel_reason}`}</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-6">
          {/* 1. Stock & price confirmation */}
          <Card title="1) التوفر والسعر لدى المورد">
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.id} className="rounded-md border border-line p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span>
                      {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="font-semibold hover:underline">{i.product_name}</Link> : <strong>{i.product_name}</strong>}
                      <span className="text-xs text-muted"> · {[i.variant_label, i.sku, `× ${i.quantity}`].filter(Boolean).join(" · ")}</span>
                    </span>
                    <Badge tone={i.stock_status === "available" ? "success" : i.stock_status === "unavailable" ? "danger" : "warning"}>{label(t.stockStatus, i.stock_status)}</Badge>
                  </div>
                  <p className="mb-2 text-xs text-muted">
                    تكلفة المورد (لقطة عند الطلب): {i.unit_cost && i.cost_currency ? `${formatMoney(i.unit_cost, i.cost_currency)} للقطعة` : "غير مسجلة"}
                    {i.supplier_url && <> · <a href={i.supplier_url} target="_blank" rel="noopener noreferrer" className="underline">رابط المورد</a></>}
                    {i.stock_confirmed_at && <> · آخر تأكيد {formatDate(i.stock_confirmed_at)}</>}
                  </p>
                  {preApproval ? (
                    <ActionForm action={confirmStockAction} submitLabel="حفظ" size="sm" variant="secondary" className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_8rem_1fr_auto] sm:items-end">
                      <input type="hidden" name="itemId" value={i.id} />
                      <Select name="stockStatus" defaultValue={i.stock_status} className={small} aria-label="حالة التوفر">
                        {Object.entries(t.stockStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </Select>
                      <Input name="unitPrice" defaultValue={i.unit_price} dir="ltr" className={small} aria-label={`سعر البيع للقطعة (${cur})`} />
                      <Input name="note" defaultValue={i.stock_note ?? ""} placeholder="ملاحظة (مثلاً: أكده المورد هاتفيًا)" className={`${small} col-span-2 sm:col-span-1`} aria-label="ملاحظة التوفر" />
                    </ActionForm>
                  ) : (
                    <p className="text-sm">سعر البيع: {formatMoney(i.unit_price, cur)} × {i.quantity} = {formatMoney(i.line_total, cur)}{i.stock_note && <span className="text-xs text-muted"> · {i.stock_note}</span>}</p>
                  )}
                </li>
              ))}
            </ul>
            {preApproval && (
              <div className="mt-5 rounded-md border border-dashed border-line p-4">
                <h3 className="mb-1 text-sm font-bold">اعتماد السعر النهائي للعميل</h3>
                <p className="mb-3 text-xs text-muted">يُحسب الإجمالي على الخادم: المنتجات − الخصم + رسوم التوصيل + الرسوم المعلنة. يتطلب تأكيد توفر كل المنتجات.</p>
                {!allAvailable && <Notice tone="warning">أكّد توفر كل المنتجات (متوفر لدى المورد) أولًا.</Notice>}
                <ActionForm action={approvePriceAction} submitLabel="اعتماد السعر وإظهار تعليمات الدفع" className="mt-3 space-y-3">
                  <input type="hidden" name="orderId" value={o.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label={`رسوم التوصيل على العميل (${cur})`}><Input name="shippingFee" dir="ltr" defaultValue={o.shipping_cost} /></Field>
                    <Field label="خصم"><Input name="discount" dir="ltr" defaultValue={o.discount_total} /></Field>
                    <Field label="رسوم معلنة أخرى"><Input name="fees" dir="ltr" defaultValue={o.fees_total} /></Field>
                    <Field label="اسم الرسوم (يظهر للعميل)"><Input name="feesLabel" defaultValue={o.fees_label ?? ""} placeholder="مثل: رسوم تغليف" /></Field>
                    <Field label="تكلفة التوصيل المتوقعة عليك" hint="لحساب الربح المتوقع فقط"><Input name="expectedShippingCost" dir="ltr" defaultValue={o.expected_shipping_cost ?? ""} /></Field>
                    <Field label="صلاحية تعليمات الدفع (ساعات)"><Input name="validityHours" type="number" min={1} max={720} defaultValue={48} /></Field>
                  </div>
                </ActionForm>
              </div>
            )}
            <dl className="mt-4 grid gap-1 text-sm sm:max-w-sm">
              <div className="flex justify-between"><dt className="text-muted">المنتجات</dt><dd>{formatMoney(o.subtotal, cur)}</dd></div>
              {toMills(o.discount_total) > 0 && <div className="flex justify-between"><dt className="text-muted">الخصم</dt><dd>− {formatMoney(o.discount_total, cur)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">رسوم التوصيل (إيراد)</dt><dd>{formatMoney(o.shipping_cost, cur)}</dd></div>
              {toMills(o.fees_total) > 0 && <div className="flex justify-between"><dt className="text-muted">{o.fees_label}</dt><dd>{formatMoney(o.fees_total, cur)}</dd></div>}
              <div className="flex justify-between border-t border-line pt-1 font-bold"><dt>{o.price_approved_at ? "الإجمالي المعتمد" : "الإجمالي التقديري"}</dt><dd>{formatMoney(o.total, cur)}</dd></div>
            </dl>
          </Card>

          {/* 2. Payment */}
          <Card title="2) الدفع والتحقق من التحويل">
            <dl className="mb-4 grid gap-1 text-sm sm:max-w-sm">
              <div className="flex justify-between"><dt className="text-muted">المطلوب</dt><dd>{formatMoney(o.total, cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">المحصّل والمؤكد</dt><dd>{formatMoney(o.amount_collected, cur)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">المتبقي</dt><dd>{formatMoney(remaining, cur)}</dd></div>
              {o.payment_verified_at && <div className="flex justify-between"><dt className="text-muted">تاريخ التحقق</dt><dd>{formatDate(o.payment_verified_at)}{o.payment_reference && ` · ${o.payment_reference}`}</dd></div>}
              {o.payment_due_at && !paid && <div className="flex justify-between"><dt className="text-muted">صلاحية التعليمات</dt><dd>{formatDate(o.payment_due_at)}</dd></div>}
            </dl>
            {proofs.length === 0 && <p className="text-sm text-muted">لا توجد إثباتات تحويل بعد.</p>}
            <ul className="space-y-3">
              {proofs.map((p) => (
                <li key={p.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{formatMoney(p.declared_amount, cur)}</strong>
                    <Badge tone={p.status === "accepted" ? "success" : p.status === "rejected" ? "danger" : "warning"}>{label(t.proofStatus, p.status)}</Badge>
                    <span className="text-xs text-muted">{p.source === "admin" ? "سجلته الإدارة" : "من العميل"} · {formatDate(p.created_at)}</span>
                    {p.has_file && <a href={`/admin/proofs/${p.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-beige-deep underline">عرض الملف <ExternalLink className="size-3" /></a>}
                  </div>
                  {(p.customer_reference || p.customer_note) && <p className="mt-1 text-xs text-muted">{[p.customer_reference && `مرجع العميل: ${p.customer_reference}`, p.customer_note].filter(Boolean).join(" · ")}</p>}
                  {p.status === "accepted" && <p className="mt-1 text-xs text-success">وصل فعليًا: {formatMoney(p.verified_amount ?? "0", cur)} بتاريخ {p.verified_at && formatDate(p.verified_at)}{p.verified_reference && ` · مرجع ${p.verified_reference}`}{p.reviewer && ` · ${p.reviewer}`}</p>}
                  {p.status === "rejected" && <p className="mt-1 text-xs text-danger">سبب الرفض: {p.rejection_reason}</p>}
                  {p.status === "pending" && (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <ActionForm action={reviewProofAction} submitLabel="تأكيد وصول المبلغ" size="sm" className="space-y-2 rounded-md bg-success/5 p-3">
                        <input type="hidden" name="proofId" value={p.id} />
                        <input type="hidden" name="decision" value="accept" />
                        <Field label="المبلغ الذي وصل فعليًا"><Input name="verifiedAmount" dir="ltr" defaultValue={p.declared_amount} className={small} /></Field>
                        <Field label="تاريخ التحقق"><Input name="verifiedAt" type="date" defaultValue={today()} className={small} /></Field>
                        <Field label="مرجع الحركة في كشف الحساب"><Input name="verifiedReference" dir="ltr" className={small} /></Field>
                        <Checkbox name="confirmReceived" label="تحققت بنفسي من وصول المبلغ إلى الحساب" />
                      </ActionForm>
                      <ActionForm action={reviewProofAction} submitLabel="رفض الإثبات" size="sm" variant="outline" className="space-y-2 rounded-md bg-danger/5 p-3">
                        <input type="hidden" name="proofId" value={p.id} />
                        <input type="hidden" name="decision" value="reject" />
                        <Field label="سبب الرفض (يظهر للعميل)"><Textarea name="reason" rows={2} required /></Field>
                      </ActionForm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {["awaiting_payment", "payment_review"].includes(o.status) && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-beige-deep">تسجيل دفعة وصلت دون إثبات من الموقع</summary>
                <ActionForm action={recordPaymentAction} submitLabel="تسجيل الدفعة" size="sm" className="mt-3 grid gap-2 sm:grid-cols-3 sm:items-end">
                  <input type="hidden" name="orderId" value={o.id} />
                  <Field label="المبلغ الواصل"><Input name="amount" dir="ltr" defaultValue={remaining} className={small} /></Field>
                  <Field label="تاريخ التحقق"><Input name="verifiedAt" type="date" defaultValue={today()} className={small} /></Field>
                  <Field label="مرجع الحركة"><Input name="reference" dir="ltr" className={small} /></Field>
                  <div className="sm:col-span-3"><Checkbox name="confirmReceived" label="تحققت بنفسي من وصول المبلغ إلى الحساب" /></div>
                </ActionForm>
              </details>
            )}
          </Card>

          {/* 3. Fulfillment, shipment, supplier settlement */}
          {fulfillments.map((f, idx) => {
            const fItems = items.filter((i) => i.fulfillment_id === f.id);
            const due = f.actual_cost !== null ? fromMills(toMills(f.actual_cost) + (f.shipping_paid_to === "supplier" ? toMills(f.actual_shipping_cost) : 0)) : null;
            return (
              <Card key={f.id} title={<span className="flex flex-wrap items-center gap-2">3.{idx + 1}) التنفيذ: {f.supplier_name ?? <span className="text-warning">بدون مورد</span>} <Badge>{label(t.fulfillmentStatus, f.status)}</Badge> <Badge tone={f.settlement_status === "paid" ? "success" : "neutral"}>تسوية: {label(t.settlementStatus, f.settlement_status)}</Badge></span>}>
                <div className="mb-4 space-y-2">
                  {paid && allAvailable ? (
                    <>
                      <p className="text-xs leading-6 text-muted">أرسل الطلب للمورد يدويًا{f.supplier_contact ? ` (${f.supplier_contact})` : ""} ثم غيّر حالة التنفيذ إلى «أُرسل للمورد».</p>
                      <CopyButton text={supplierText(o, fItems)} label="نسخ تفاصيل الطلب للمورد" />
                    </>
                  ) : (
                    <Notice tone="warning">لا يُرسل الطلب للمورد قبل تأكيد الدفع وتوفر المنتجات.</Notice>
                  )}
                </div>
                <ActionForm action={updateFulfillmentAction} submitLabel="حفظ التنفيذ والشحن" size="sm" className="space-y-3">
                  <input type="hidden" name="id" value={f.id} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="المورد"><Select name="supplierId" defaultValue={f.supplier_id ?? ""}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                    <Field label="حالة التنفيذ/الشحنة"><Select name="status" defaultValue={f.status}>{Object.entries(t.fulfillmentStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                    <Field label="رقم الطلب لدى المورد"><Input name="supplierOrderRef" dir="ltr" defaultValue={f.supplier_order_ref ?? ""} /></Field>
                    <Field label="شركة التوصيل"><Input name="carrier" defaultValue={f.carrier ?? ""} /></Field>
                    <Field label="رقم التتبع" hint="يظهر للعميل — لا يعني التسليم"><Input name="trackingNumber" dir="ltr" defaultValue={f.tracking_number ?? ""} /></Field>
                    <Field label="رابط التتبع"><Input name="trackingUrl" dir="ltr" defaultValue={f.tracking_url ?? ""} placeholder="https://" /></Field>
                    <Field label="سبب التأخير/فشل التسليم"><Input name="issueReason" defaultValue={f.issue_reason ?? ""} /></Field>
                    <Field label="عملة التكاليف"><Select name="costCurrency" defaultValue={f.cost_currency ?? cur}><option value="">—</option>{currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</Select></Field>
                    <Field label="تكلفة المنتجات المتفق عليها"><Input name="actualCost" dir="ltr" defaultValue={f.actual_cost ?? f.expected_cost ?? ""} /></Field>
                    <Field label="تكلفة التوصيل الفعلية"><Input name="actualShippingCost" dir="ltr" defaultValue={f.actual_shipping_cost ?? ""} /></Field>
                    <Field label="تكلفة التوصيل تُدفع إلى" hint="تُحتسب مرة واحدة فقط">
                      <Select name="shippingPaidTo" defaultValue={f.shipping_paid_to}>
                        <option value="supplier">المورد (ضمن مستحقاته)</option><option value="courier">شركة التوصيل مباشرة</option><option value="none">لا يوجد</option>
                      </Select>
                    </Field>
                    <Field label="مبلغ يعيده المورد (إن وجد)"><Input name="supplierRefundAmount" dir="ltr" defaultValue={f.supplier_refund_amount ?? ""} /></Field>
                    <Field label="حالة إعادة المورد للمبلغ"><Select name="supplierRefundStatus" defaultValue={f.supplier_refund_status}><option value="none">لا يوجد</option><option value="pending">معلّق</option><option value="received">تم الاستلام فعليًا</option></Select></Field>
                  </div>
                  <Field label="ملاحظات داخلية"><Textarea name="notes" rows={2} defaultValue={f.notes ?? ""} /></Field>
                  <p className="text-xs text-muted">{[f.sent_at && `أُرسل ${formatDate(f.sent_at)}`, f.shipped_at && `شُحن ${formatDate(f.shipped_at)}`, f.delivered_at && `سُلّم ${formatDate(f.delivered_at)}`].filter(Boolean).join(" · ")}</p>
                </ActionForm>

                <div className="mt-5 rounded-md border border-dashed border-line p-4">
                  <h3 className="mb-2 text-sm font-bold">مستحقات المورد</h3>
                  <p className="mb-3 text-sm">المستحق: <strong>{due ? formatMoney(due, f.cost_currency ?? cur) : "سجّل التكلفة المتفق عليها أولًا"}</strong>
                    {f.settlement_status === "paid" && <span className="text-success"> · حُوّل {formatMoney(f.settlement_paid_amount ?? "0", f.cost_currency ?? cur)} بتاريخ {f.settlement_paid_at && formatDate(f.settlement_paid_at)} (مرجع {f.settlement_reference}){f.settlement_by && ` · ${f.settlement_by}`}</span>}
                  </p>
                  <ActionForm action={updateSettlementAction} submitLabel="حفظ التسوية" size="sm" variant="secondary" confirm="تأكيد تسجيل حالة التسوية؟ (التحويل نفسه يتم يدويًا خارج المنصة)" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
                    <input type="hidden" name="id" value={f.id} />
                    <Field label="الحالة"><Select name="status" defaultValue={f.settlement_status} className={small}>{Object.entries(t.settlementStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                    <Field label="المبلغ المحوّل"><Input name="paidAmount" dir="ltr" defaultValue={f.settlement_paid_amount ?? due ?? ""} className={small} /></Field>
                    <Field label="تاريخ التحويل"><Input name="paidAt" type="date" defaultValue={f.settlement_paid_at?.slice(0, 10) ?? ""} className={small} /></Field>
                    <Field label="مرجع التحويل"><Input name="reference" dir="ltr" defaultValue={f.settlement_reference ?? ""} className={small} /></Field>
                    <Field label="ملاحظات"><Input name="notes" defaultValue={f.settlement_notes ?? ""} className={small} /></Field>
                  </ActionForm>
                </div>
              </Card>
            );
          })}

          {/* 4. Financials */}
          <Card title={`4) الحسابات المالية (${cur})`}>
            <div className="grid gap-6 text-sm sm:grid-cols-2">
              <dl className="space-y-1">
                <p className="mb-1 font-semibold">الإيرادات</p>
                <div className="flex justify-between"><dt className="text-muted">الإيراد المتوقع (الإجمالي)</dt><dd>{formatMoney(fin.expectedRevenue, cur)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">المحصّل فعليًا</dt><dd>{formatMoney(fin.collected, cur)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">المسترد المنفّذ</dt><dd>− {formatMoney(fin.refundsCompleted, cur)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">استردادات معلّقة</dt><dd>{formatMoney(fin.refundsPending, cur)}</dd></div>
                <div className="flex justify-between font-semibold"><dt>صافي المحصّل</dt><dd>{formatMoney(fin.netCollected, cur)}</dd></div>
              </dl>
              <dl className="space-y-1">
                <p className="mb-1 font-semibold">التكاليف والمستحقات</p>
                <div className="flex justify-between"><dt className="text-muted">تكلفة المنتجات</dt><dd>{m(fin.productCost)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">تكلفة التوصيل الفعلية</dt><dd>{m(fin.shippingCost)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">رسوم ومصروفات أخرى</dt><dd>{formatMoney(fin.expenses, cur)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">المستحق للموردين</dt><dd>{m(fin.supplierDue)}</dd></div>
                <div className="flex justify-between"><dt className="text-muted">حُوّل للموردين (ليس ربحًا)</dt><dd>{formatMoney(fin.supplierTransferred, cur)}</dd></div>
              </dl>
            </div>
            <div className="mt-4 grid gap-2 border-t border-line pt-3 text-sm sm:grid-cols-2">
              <p>الربح المتوقع: <strong>{fin.expectedProfit === null ? "غير محسوب" : formatMoney(fin.expectedProfit, cur)}</strong></p>
              <p>الربح الفعلي: <strong className={fin.actualProfit && Number(fin.actualProfit) < 0 ? "text-danger" : "text-success"}>{fin.actualProfit === null ? "غير محسوب بعد" : formatMoney(fin.actualProfit, cur)}</strong></p>
            </div>
            {fin.missing.length > 0 && <p className="mt-2 text-xs text-muted">لاكتمال الحساب: {fin.missing.join(" · ")}</p>}
            <p className="mt-2 text-xs text-muted">الربح الفعلي = صافي المحصّل − تكلفة المنتجات − تكلفة التوصيل الفعلية (مرة واحدة) − الرسوم والمصروفات + ما أعاده المورد فعليًا.</p>
            <ActionForm action={addExpenseAction} submitLabel="إضافة مصروف" size="sm" variant="secondary" resetOnSuccess className="mt-4 grid gap-2 sm:grid-cols-[auto_8rem_1fr_auto] sm:items-end">
              <input type="hidden" name="orderId" value={o.id} />
              <Select name="kind" className={small} aria-label="نوع المصروف">{Object.entries(t.expenseKind).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
              <Input name="amount" dir="ltr" placeholder={`المبلغ ${cur}`} className={small} aria-label="المبلغ" />
              <Input name="note" placeholder="ملاحظة" className={small} aria-label="ملاحظة المصروف" />
            </ActionForm>
            {expenses.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-muted">
                {expenses.map((e) => <li key={e.id}>{label(t.expenseKind, e.kind)}: {formatMoney(e.amount, e.currency_code)} {e.note && `— ${e.note}`} · {formatDate(e.created_at)}</li>)}
              </ul>
            )}
          </Card>

          {/* 5. Refunds and returns */}
          <Card title="5) الاستردادات والمرتجعات">
            {refunds.length === 0 && <p className="mb-3 text-sm text-muted">لا توجد استردادات.</p>}
            {refundAccounts.length > 0 && (
              <div className="mb-3 rounded-md bg-sand/50 p-3 text-sm">
                <p className="mb-1 font-semibold">بيانات استلام الاسترداد من العميل</p>
                {refundAccounts.map((a) => <p key={a.id}>{a.holder_name} · {a.method_label} · <span className="ltr font-mono">{a.account_ref}</span> <span className="text-xs text-muted">({formatDate(a.created_at)})</span></p>)}
              </div>
            )}
            <ul className="space-y-3">
              {refunds.map((r) => (
                <li key={r.id} className="rounded-md border border-line p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2"><strong>{formatMoney(r.amount, cur)}</strong><Badge tone={r.status === "completed" ? "success" : r.status === "pending" ? "warning" : "neutral"}>{label(t.refundStatus, r.status)}</Badge><span className="text-xs text-muted">{r.reason}</span></div>
                  {r.status === "completed" && <p className="mt-1 text-xs text-muted">نُفّذ {r.completed_at && formatDate(r.completed_at)} · {r.method} · مرجع {r.reference}</p>}
                  {r.status === "pending" && (
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      <ActionForm action={completeRefundAction} submitLabel="تسجيل التنفيذ" size="sm" confirm="هل تم تحويل المبلغ للعميل فعلًا؟" className="grid gap-2 sm:grid-cols-3 sm:items-end">
                        <input type="hidden" name="refundId" value={r.id} />
                        <Input name="method" placeholder="الطريقة" className={small} aria-label="طريقة الاسترداد" />
                        <Input name="reference" placeholder="المرجع" dir="ltr" className={small} aria-label="مرجع الاسترداد" />
                        <Input name="completedAt" type="date" defaultValue={today()} className={small} aria-label="تاريخ التنفيذ" />
                      </ActionForm>
                      <ActionForm action={cancelRefundAction} submitLabel="إلغاء السجل" size="sm" variant="ghost" className="flex items-end gap-2">
                        <input type="hidden" name="refundId" value={r.id} />
                        <Input name="reason" placeholder="سبب الإلغاء" className={small} aria-label="سبب إلغاء الاسترداد" />
                      </ActionForm>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {toMills(o.amount_collected) > 0 && (
              <ActionForm action={createRefundAction} submitLabel="تسجيل استرداد (معلّق)" size="sm" variant="secondary" resetOnSuccess className="mt-4 grid gap-2 sm:grid-cols-[8rem_1fr_auto_auto] sm:items-end">
                <input type="hidden" name="orderId" value={o.id} />
                <Input name="amount" dir="ltr" placeholder={`المبلغ ${cur}`} className={small} aria-label="مبلغ الاسترداد" />
                <Input name="reason" placeholder="السبب" className={small} aria-label="سبب الاسترداد" />
                <Select name="returnRequestId" className={small} aria-label="مرتبط بطلب إرجاع"><option value="">بدون طلب إرجاع</option>{returns.map((r) => <option key={r.id} value={r.id}>{label(t.returnKind, r.kind)} — {formatDate(r.created_at)}</option>)}</Select>
              </ActionForm>
            )}
            {returns.length > 0 && (
              <ul className="mt-5 space-y-3">
                {returns.map((r) => (
                  <li key={r.id} className="rounded-md border border-line p-3 text-sm">
                    <p><Badge>{label(t.returnKind, r.kind)}</Badge> <Badge>{label(t.returnStatus, r.status)}</Badge> <span className="text-xs text-muted">{formatDate(r.created_at)}</span></p>
                    <p className="my-2">{r.reason}</p>
                    <ActionForm action={updateReturnAction} submitLabel="تحديث" size="sm" className="grid gap-2 sm:grid-cols-3 sm:items-end">
                      <input type="hidden" name="id" value={r.id} />
                      <Field label="الحالة"><Select name="status" defaultValue={r.status} className={small}>{Object.entries(t.returnStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                      <Field label="من يتحمل التكلفة"><Select name="costParty" defaultValue={r.cost_party ?? ""} className={small}><option value="">—</option>{Object.entries(t.costParty).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                      <Field label="ملاحظات"><Input name="adminNotes" defaultValue={r.admin_notes ?? ""} className={small} /></Field>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="العميل والتوصيل">
            <dl className="space-y-1.5 text-sm">
              <div><dt className="inline text-muted">الاسم: </dt><dd className="inline">{o.customer_name}</dd></div>
              <div><dt className="inline text-muted">الهاتف: </dt><dd className="inline"><a className="ltr underline" href={`tel:${o.customer_phone.replace(/\s/g, "")}`}>{o.customer_phone}</a> · <a className="underline" href={`https://wa.me/${o.customer_phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">واتساب</a></dd></div>
              <div><dt className="inline text-muted">المنطقة: </dt><dd className="inline">{[o.country_name, o.governorate_name, o.city].filter(Boolean).join(" — ")}</dd></div>
              <div><dt className="inline text-muted">العنوان: </dt><dd className="inline">{o.address_line}</dd></div>
              {o.customer_notes && <div><dt className="inline text-muted">ملاحظات: </dt><dd className="inline">{o.customer_notes}</dd></div>}
              <div><dt className="inline text-muted">الحساب: </dt><dd className="inline">{o.user_id ? "عميل مسجل" : "ضيف"}</dd></div>
              {o.estimated_min_days != null && <div><dt className="inline text-muted">التوصيل المقدر: </dt><dd className="inline">{o.estimated_min_days}–{o.estimated_max_days} يوم</dd></div>}
            </dl>
          </Card>

          {o.status === "cancel_requested" && (
            <Card title="قرار طلب الإلغاء">
              <ActionForm action={decideCancelAction} submitLabel="حفظ القرار" className="space-y-3">
                <input type="hidden" name="orderId" value={o.id} />
                <Field label="القرار"><Select name="approve"><option value="yes">موافقة على الإلغاء</option><option value="no">رفض وإرجاع الطلب لحالته</option></Select></Field>
                <Field label="ملاحظة للعميل"><Textarea name="note" rows={2} /></Field>
                <Field label="من يتحمل تكلفة التوصيل/الرسوم"><Select name="costParty" defaultValue="none">{Object.entries(t.costParty).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                <Field label={`مبلغ غير قابل للاسترداد (${cur})`} hint="وفق السياسة المعلنة فقط"><Input name="nonRefundable" dir="ltr" defaultValue="0" /></Field>
              </ActionForm>
            </Card>
          )}

          <Card title="تغيير الحالة">
            {next.length === 0 ? (
              <p className="text-sm text-muted">لا انتقالات يدوية من هذه الحالة. {preApproval ? "" : o.status === "awaiting_payment" ? "تنتقل تلقائيًا عند رفع إثبات أو تسجيل دفعة." : ""}</p>
            ) : (
              <ActionForm action={transitionAction} submitLabel="تحديث الحالة" className="space-y-3">
                <input type="hidden" name="orderId" value={o.id} />
                <Field label="الحالة الجديدة"><Select name="to">{next.map((s) => <option key={s} value={s}>{label(t.orderStatus, s)}</option>)}</Select></Field>
                <Field label="ملاحظة / سبب"><Textarea name="note" rows={2} /></Field>
                <Checkbox name="visible" defaultChecked label="إظهار الملاحظة للعميل" />
              </ActionForm>
            )}
            <p className="mt-3 text-xs leading-6 text-muted">«قيد التجهيز» يتطلب تأكيد الدفع وتوفر المنتجات. «تم التسليم» تأكيد صريح منك ولا يكفي رقم التتبع.</p>
          </Card>

          {!TERMINAL.includes(o.status) && !["delivered", "returned", "refund_pending", "cancel_requested"].includes(o.status) && (
            <Card title="إلغاء الطلب">
              <ActionForm action={cancelOrderAction} submitLabel="إلغاء الطلب" variant="danger" confirm="إلغاء الطلب؟ إذا كان مدفوعًا سيُسجّل استرداد معلّق." className="space-y-3">
                <input type="hidden" name="orderId" value={o.id} />
                <Field label="السبب"><Textarea name="reason" rows={2} required /></Field>
                <Field label="من يتحمل التكلفة"><Select name="costParty" defaultValue="none">{Object.entries(t.costParty).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                {toMills(o.amount_collected) > 0 && <Field label={`مبلغ غير قابل للاسترداد (${cur})`}><Input name="nonRefundable" dir="ltr" defaultValue="0" /></Field>}
              </ActionForm>
            </Card>
          )}
          {o.cancel_reason && ["cancelled", "refund_pending", "refunded"].includes(o.status) && (
            <Card title="بيانات الإلغاء"><p className="text-sm">{o.cancel_reason} · بواسطة {o.cancelled_by === "customer" ? "العميل" : "الإدارة"} · التكلفة على: {label(t.costParty, o.cancel_cost_party)} · غير مسترد: {formatMoney(o.non_refundable_amount, cur)}</p></Card>
          )}

          <Card title="سجل الحالات والملاحظات">
            <ol className="mb-4 space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-s-2 border-line ps-3">
                  <p className="font-semibold">{e.status ? `${e.from_status ? `${label(t.orderStatus, e.from_status)} ← ` : ""}${label(t.orderStatus, e.status)}` : "ملاحظة"} {!e.visible_to_customer && <span className="text-xs font-normal text-muted">(داخلية)</span>}</p>
                  {e.note && <p className="text-ink-soft">{e.note}</p>}
                  <p className="text-xs text-muted">{formatDate(e.created_at)} · {e.actor ?? (e.status ? "العميل/النظام" : "النظام")}</p>
                </li>
              ))}
            </ol>
            <ActionForm action={addOrderNoteAction} submitLabel="إضافة ملاحظة" size="sm" resetOnSuccess className="space-y-2">
              <input type="hidden" name="id" value={o.id} />
              <Textarea name="note" rows={2} aria-label="ملاحظة" required />
              <Checkbox name="visible" label="مرئية للعميل" />
            </ActionForm>
          </Card>
        </div>
      </div>
    </div>
  );
}
