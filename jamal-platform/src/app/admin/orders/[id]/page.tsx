import Link from "next/link";
import { notFound } from "next/navigation";
import { withAdmin } from "@/lib/admin";
import {
  addOrderNoteAction, updateFulfillmentAction, updateOrderStatusAction, updatePaymentStatusAction, updateReturnAction,
} from "@/lib/actions/admin/operations";
import { ORDER_STATUS_FLOW } from "@/lib/pricing";
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
  id: string; order_number: string; user_id: string | null; customer_name: string; customer_phone: string; customer_email: string | null;
  country_code: string; country_name: string; city: string; address_line: string; customer_notes: string | null; currency_code: string;
  subtotal: string; shipping_cost: string; total: string; payment_method: string; payment_status: string; status: string; is_test: boolean;
  cancel_reason: string | null; created_at: string; estimated_min_days: number | null; estimated_max_days: number | null;
};
type Item = {
  id: string; product_id: string | null; product_name: string; variant_label: string | null; sku: string | null; unit_price: string; quantity: number;
  line_total: string; fulfillment_id: string | null; supplier_sku: string | null; supplier_url: string | null; unit_cost: string | null;
  unit_shipping_cost: string | null; cost_currency: string | null;
};
type Fulfillment = {
  id: string; supplier_id: string | null; supplier_name: string | null; supplier_contact: string | null; status: string; supplier_order_ref: string | null;
  carrier: string | null; tracking_number: string | null; tracking_url: string | null; cost_currency: string | null; expected_cost: string | null;
  actual_cost: string | null; actual_shipping_cost: string | null; notes: string | null; sent_at: string | null;
};
type Event = { id: string; status: string | null; note: string | null; visible_to_customer: boolean; created_at: string; actor: string | null };
type Return = { id: string; status: string; reason: string; refund_amount: string | null; admin_notes: string | null; created_at: string };

function supplierText(o: Order, f: Fulfillment, items: Item[], single: boolean) {
  const lines = items.map((i) => {
    const parts = [`- ${i.product_name}${i.variant_label ? ` (${i.variant_label})` : ""} × ${i.quantity}`];
    if (i.supplier_sku) parts.push(`  SKU: ${i.supplier_sku}`);
    if (i.supplier_url) parts.push(`  ${i.supplier_url}`);
    return parts.join("\n");
  });
  const cod =
    o.payment_method === "cod"
      ? single
        ? `الدفع عند الاستلام — المبلغ المطلوب تحصيله: ${fromMills(toMills(o.total))} ${o.currency_code}`
        : "الدفع عند الاستلام — يُحدد مبلغ التحصيل بالتنسيق (الطلب موزع على أكثر من مورد)"
      : "مدفوع/يُسوّى مع المتجر — لا تحصيل من العميل";
  return [
    `طلب جديد من متجر JAMAL`,
    `رقم الطلب: ${o.order_number}`,
    ``,
    `المنتجات:`,
    ...lines,
    ``,
    `بيانات الشحن:`,
    `الاسم: ${o.customer_name}`,
    `الهاتف: ${o.customer_phone}`,
    `الدولة / المدينة: ${o.country_name} / ${o.city}`,
    `العنوان: ${o.address_line}`,
    o.customer_notes ? `ملاحظات العميل: ${o.customer_notes}` : null,
    ``,
    cod,
    `يرجى تأكيد الاستلام وتزويدنا برقم التتبع عند الشحن.`,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

export default async function AdminOrder({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await withAdmin(async (tx) => {
    const [order] = await tx.query<Order>(
      `select o.id, o.order_number, o.user_id, o.customer_name, o.customer_phone, o.customer_email, o.country_code, c.name_ar as country_name,
              o.city, o.address_line, o.customer_notes, o.currency_code, o.subtotal::text, o.shipping_cost::text, o.total::text,
              o.payment_method, o.payment_status, o.status, o.is_test, o.cancel_reason, o.created_at::text, o.estimated_min_days, o.estimated_max_days
       from public.orders o join public.countries c on c.code = o.country_code where o.id = $1`,
      [id],
    );
    if (!order) return null;
    const items = await tx.query<Item>(
      `select i.id, i.product_id, i.product_name, i.variant_label, i.sku, i.unit_price::text, i.quantity, i.line_total::text,
              c.fulfillment_id, c.supplier_sku, c.supplier_url, c.unit_cost::text, c.unit_shipping_cost::text, c.cost_currency
       from public.order_items i left join public.order_item_costs c on c.order_item_id = i.id where i.order_id = $1 order by i.product_name`,
      [id],
    );
    const fulfillments = await tx.query<Fulfillment>(
      `select f.id, f.supplier_id, s.name as supplier_name, coalesce(s.whatsapp, s.phone, s.email) as supplier_contact, f.status, f.supplier_order_ref,
              f.carrier, f.tracking_number, f.tracking_url, f.cost_currency, f.expected_cost::text, f.actual_cost::text,
              f.actual_shipping_cost::text, f.notes, f.sent_at::text
       from public.fulfillment_records f left join public.suppliers s on s.id = f.supplier_id where f.order_id = $1 order by f.created_at`,
      [id],
    );
    const events = await tx.query<Event>(
      `select e.id, e.status, e.note, e.visible_to_customer, e.created_at::text, p.email as actor
       from public.order_events e left join public.profiles p on p.id = e.actor_id where e.order_id = $1 order by e.created_at`,
      [id],
    );
    const returns = await tx.query<Return>(
      "select id, status, reason, refund_amount::text, admin_notes, created_at::text from public.return_requests where order_id = $1 order by created_at",
      [id],
    );
    const suppliers = await tx.query<{ id: string; name: string }>("select id, name from public.suppliers order by name");
    const currencies = await tx.query<{ code: string }>("select code from public.currencies order by is_active desc, code");
    return { order, items, fulfillments, events, returns, suppliers, currencies };
  });
  if (!data) notFound();
  const { order: o, items, fulfillments, events, returns, suppliers, currencies } = data;
  const next = ORDER_STATUS_FLOW[o.status] ?? [];

  // Profit: only when every active fulfillment has an actual cost in the sale currency.
  const active = fulfillments.filter((f) => f.status !== "cancelled");
  const refunded = returns.filter((r) => r.status === "refunded").reduce((s, r) => s + toMills(r.refund_amount), 0);
  const expectedComplete = items.every((i) => i.unit_cost !== null && i.cost_currency === o.currency_code);
  const expectedCost = expectedComplete
    ? items.reduce((s, i) => s + (toMills(i.unit_cost) + toMills(i.unit_shipping_cost)) * i.quantity, 0)
    : null;
  const actualComplete = active.length > 0 && active.every((f) => f.actual_cost !== null && f.cost_currency === o.currency_code);
  const actualCost = actualComplete ? active.reduce((s, f) => s + toMills(f.actual_cost) + toMills(f.actual_shipping_cost), 0) : null;
  const revenue = toMills(o.total) - refunded;

  return (
    <div className="space-y-6">
      <AdminTitle
        title={o.order_number}
        description={<span className="flex flex-wrap items-center gap-2"><OrderStatusBadge status={o.status} /><Badge>{label(t.paymentStatus, o.payment_status)}</Badge><span>{o.payment_method === "cod" ? t.paymentMethod.cod : "طلب يدوي"}</span><span>· {formatDate(o.created_at)}</span>{o.is_test && <Badge tone="warning">طلب اختبار — مستثنى من المبيعات</Badge>}</span>}
        action={<Link href="/admin/orders" className="text-sm text-muted hover:underline">كل الطلبات</Link>}
      />
      {o.status === "pending" && <Notice tone="warning">تواصل مع العميل لتأكيد الطلب، ثم غيّر الحالة إلى «مؤكد» قبل إرساله للمورد.</Notice>}

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card title="المنتجات والتكاليف">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-xs text-muted"><tr><th className="py-2 text-start">المنتج</th><th className="text-start">الكمية</th><th className="text-start">سعر البيع</th><th className="text-start">تكلفة المورد (لقطة عند الطلب)</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="py-2">
                        {i.product_id ? <Link href={`/admin/products/${i.product_id}`} className="font-semibold hover:underline">{i.product_name}</Link> : <span className="font-semibold">{i.product_name}</span>}
                        <div className="text-xs text-muted">{[i.variant_label, i.sku].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td>{i.quantity}</td>
                      <td>{formatMoney(i.line_total, o.currency_code)}</td>
                      <td className="text-xs">{i.unit_cost && i.cost_currency ? `${formatMoney(i.unit_cost, i.cost_currency)} + شحن ${formatMoney(i.unit_shipping_cost ?? "0", i.cost_currency)} للوحدة` : <span className="text-warning">غير مسجلة</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="mt-4 grid gap-1 text-sm sm:max-w-sm">
              <div className="flex justify-between"><dt className="text-muted">المجموع الفرعي</dt><dd>{formatMoney(o.subtotal, o.currency_code)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">الشحن المحصّل</dt><dd>{formatMoney(o.shipping_cost, o.currency_code)}</dd></div>
              <div className="flex justify-between font-bold"><dt>الإجمالي</dt><dd>{formatMoney(o.total, o.currency_code)}</dd></div>
              {refunded > 0 && <div className="flex justify-between text-danger"><dt>المسترد</dt><dd>− {formatMoney(fromMills(refunded), o.currency_code)}</dd></div>}
              <div className="mt-2 flex justify-between border-t border-line pt-2"><dt className="text-muted">الربح المتوقع</dt><dd>{expectedCost === null ? <span className="text-xs text-warning">غير محسوب (تكلفة ناقصة أو بعملة مختلفة)</span> : formatMoney(fromMills(revenue - expectedCost), o.currency_code)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">الربح الفعلي</dt><dd>{actualCost === null ? <span className="text-xs text-muted">يُحسب بعد إدخال التكاليف الفعلية بعملة {o.currency_code}</span> : <strong className={revenue - actualCost >= 0 ? "text-success" : "text-danger"}>{formatMoney(fromMills(revenue - actualCost), o.currency_code)}</strong>}</dd></div>
            </dl>
          </Card>

          {fulfillments.map((f, idx) => {
            const fItems = items.filter((i) => i.fulfillment_id === f.id);
            return (
              <Card key={f.id} title={<span className="flex flex-wrap items-center gap-2">تنفيذ {idx + 1}: {f.supplier_name ?? <span className="text-warning">بدون مورد</span>} <Badge>{label(t.fulfillmentStatus, f.status)}</Badge></span>}>
                <div className="mb-4 space-y-2">
                  <p className="text-xs leading-6 text-muted">
                    إرسال الطلب للمورد يتم يدويًا: انسخ التفاصيل وأرسلها عبر قناة المورد{f.supplier_contact ? ` (${f.supplier_contact})` : ""}، ثم غيّر الحالة إلى «أُرسل للمورد».
                    {f.expected_cost && f.cost_currency && <> التكلفة المتوقعة: <strong>{formatMoney(f.expected_cost, f.cost_currency)}</strong>.</>}
                  </p>
                  <details>
                    <summary className="cursor-pointer text-sm font-semibold text-beige-deep">عرض نص الطلب للمورد</summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-md bg-sand/50 p-3 text-xs leading-6">{supplierText(o, f, fItems, fulfillments.filter((x) => x.status !== "cancelled").length === 1)}</pre>
                  </details>
                  <CopyButton text={supplierText(o, f, fItems, fulfillments.filter((x) => x.status !== "cancelled").length === 1)} label="نسخ تفاصيل الطلب للمورد" />
                </div>
                <ActionForm action={updateFulfillmentAction} submitLabel="حفظ سجل التنفيذ" size="sm" className="space-y-3">
                  <input type="hidden" name="id" value={f.id} />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="المورد"><Select name="supplier_id" defaultValue={f.supplier_id ?? ""}><option value="">—</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
                    <Field label="حالة التنفيذ"><Select name="status" defaultValue={f.status}>{Object.entries(t.fulfillmentStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                    <Field label="رقم الطلب لدى المورد"><Input name="supplier_order_ref" dir="ltr" defaultValue={f.supplier_order_ref ?? ""} /></Field>
                    <Field label="شركة الشحن"><Input name="carrier" defaultValue={f.carrier ?? ""} /></Field>
                    <Field label="رقم التتبع" hint="يظهر للعميل في صفحة طلبه"><Input name="tracking_number" dir="ltr" defaultValue={f.tracking_number ?? ""} /></Field>
                    <Field label="رابط التتبع"><Input name="tracking_url" dir="ltr" defaultValue={f.tracking_url ?? ""} placeholder="https://" /></Field>
                    <Field label="عملة التكلفة الفعلية"><Select name="cost_currency" defaultValue={f.cost_currency ?? o.currency_code}><option value="">—</option>{currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}</Select></Field>
                    <Field label="التكلفة الفعلية للمنتجات"><Input name="actual_cost" dir="ltr" defaultValue={f.actual_cost ?? ""} /></Field>
                    <Field label="تكلفة الشحن الفعلية"><Input name="actual_shipping_cost" dir="ltr" defaultValue={f.actual_shipping_cost ?? ""} /></Field>
                  </div>
                  <Field label="ملاحظات داخلية"><Textarea name="notes" rows={2} defaultValue={f.notes ?? ""} /></Field>
                </ActionForm>
              </Card>
            );
          })}

          {returns.length > 0 && (
            <Card title="طلبات الإرجاع">
              <ul className="space-y-4">
                {returns.map((r) => (
                  <li key={r.id} className="rounded-md border border-line p-3">
                    <p className="text-sm"><Badge>{label(t.returnStatus, r.status)}</Badge> <span className="text-xs text-muted">{formatDate(r.created_at)}</span></p>
                    <p className="my-2 text-sm">{r.reason}</p>
                    <ActionForm action={updateReturnAction} submitLabel="تحديث" size="sm" className="grid gap-2 sm:grid-cols-3 sm:items-end">
                      <input type="hidden" name="id" value={r.id} />
                      <Field label="الحالة"><Select name="status" defaultValue={r.status}>{Object.entries(t.returnStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
                      <Field label={`المبلغ المسترد (${o.currency_code})`}><Input name="refund_amount" dir="ltr" defaultValue={r.refund_amount ?? ""} /></Field>
                      <Field label="ملاحظات"><Input name="admin_notes" defaultValue={r.admin_notes ?? ""} /></Field>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="العميل والتوصيل">
            <dl className="space-y-1.5 text-sm">
              <div><dt className="inline text-muted">الاسم: </dt><dd className="inline">{o.customer_name}</dd></div>
              <div><dt className="inline text-muted">الهاتف: </dt><dd className="inline"><a className="ltr underline" href={`tel:${o.customer_phone.replace(/\s/g, "")}`}>{o.customer_phone}</a></dd></div>
              {o.customer_email && <div><dt className="inline text-muted">البريد: </dt><dd className="inline ltr">{o.customer_email}</dd></div>}
              <div><dt className="inline text-muted">العنوان: </dt><dd className="inline">{o.country_name} — {o.city} — {o.address_line}</dd></div>
              {o.customer_notes && <div><dt className="inline text-muted">ملاحظات: </dt><dd className="inline">{o.customer_notes}</dd></div>}
              <div><dt className="inline text-muted">الحساب: </dt><dd className="inline">{o.user_id ? "عميل مسجل" : "ضيف"}</dd></div>
              {o.estimated_min_days != null && <div><dt className="inline text-muted">التوصيل المقدر: </dt><dd className="inline">{o.estimated_min_days}–{o.estimated_max_days} يوم</dd></div>}
            </dl>
          </Card>

          <Card title="تغيير حالة الطلب">
            {next.length === 0 ? (
              <p className="text-sm text-muted">لا توجد حالات تالية لهذا الطلب.{o.cancel_reason && ` سبب الإلغاء: ${o.cancel_reason}`}</p>
            ) : (
              <ActionForm action={updateOrderStatusAction} submitLabel="تحديث الحالة" className="space-y-3">
                <input type="hidden" name="id" value={o.id} />
                <Field label="الحالة الجديدة"><Select name="status">{next.map((s) => <option key={s} value={s}>{label(t.orderStatus, s)}</option>)}</Select></Field>
                <Field label="ملاحظة (مطلوبة عند الإلغاء)"><Textarea name="note" rows={2} /></Field>
                <Checkbox name="visible" defaultChecked label="إظهار الملاحظة للعميل في مراحل الطلب" />
              </ActionForm>
            )}
          </Card>

          <Card title="حالة الدفع">
            <ActionForm action={updatePaymentStatusAction} submitLabel="حفظ" size="sm" className="flex items-end gap-2">
              <input type="hidden" name="id" value={o.id} />
              <Select name="payment_status" defaultValue={o.payment_status} aria-label="حالة الدفع">{Object.entries(t.paymentStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
            </ActionForm>
            <p className="mt-2 text-xs text-muted">لا يوجد دفع إلكتروني. سجّل «مدفوع» يدويًا بعد التحصيل الفعلي.</p>
          </Card>

          <Card title="مراحل الطلب والملاحظات">
            <ol className="mb-4 space-y-3 text-sm">
              {events.map((e) => (
                <li key={e.id} className="border-s-2 border-line ps-3">
                  <p className="font-semibold">{e.status ? label(t.orderStatus, e.status) : "ملاحظة"} {!e.visible_to_customer && <span className="text-xs font-normal text-muted">(داخلية)</span>}</p>
                  {e.note && <p className="text-ink-soft">{e.note}</p>}
                  <p className="text-xs text-muted">{formatDate(e.created_at)}{e.actor ? ` · ${e.actor}` : ""}</p>
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
