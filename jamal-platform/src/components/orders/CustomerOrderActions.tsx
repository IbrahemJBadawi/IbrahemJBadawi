import Link from "next/link";
import { customerCancelAction, refundAccountAction, requestReturnAction, uploadProofAction } from "@/lib/actions/order";
import type { OrderDetail } from "@/lib/data/orders";
import { fromMills, toMills } from "@/lib/money";
import { CUSTOMER_CANCEL_REQUEST, CUSTOMER_FREE_CANCEL } from "@/lib/orders/states";
import { t } from "@/lib/i18n/ar";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";

/** Hidden fields proving access (re-verified by every server action). */
function Access({ order, token, phone }: { order: OrderDetail; token?: string | null; phone?: string | null }) {
  return (
    <>
      <input type="hidden" name="orderNumber" value={order.order_number} />
      {token && <input type="hidden" name="t" value={token} />}
      {phone && <input type="hidden" name="p" value={phone} />}
    </>
  );
}

export function CustomerOrderActions({ order, token, phone }: { order: OrderDetail; token?: string | null; phone?: string | null }) {
  const canUpload = ["awaiting_payment", "payment_review"].includes(order.status) && order.payment_method === "bank_transfer";
  const remaining = fromMills(Math.max(0, toMills(order.total) - toMills(order.amount_collected)));
  const freeCancel = CUSTOMER_FREE_CANCEL.includes(order.status);
  const requestCancel = CUSTOMER_CANCEL_REQUEST.includes(order.status);
  const openReturn = order.returns.some((r) => ["requested", "approved", "received"].includes(r.status));
  const pendingRefund = order.refunds.some((r) => r.status === "pending");
  const hasInvoice = ["paid", "partially_refunded", "refunded"].includes(order.payment_status);
  const invoiceHref = token ? `/order/${order.order_number}/invoice?t=${token}` : `/account/orders/${order.order_number}/invoice`;
  return (
    <div className="space-y-8 border-t border-line pt-6">
      <div className="flex flex-wrap gap-4 text-sm">
        {hasInvoice && (token || !phone) && <Link href={invoiceHref} className="font-semibold text-beige-deep underline underline-offset-4">عرض الفاتورة</Link>}
        <Link href={`/support?order=${order.order_number}`} className="font-semibold text-beige-deep underline underline-offset-4">مساعدة بخصوص هذا الطلب</Link>
      </div>
      {pendingRefund && (
        <section>
          <h2 className="mb-1 text-base font-bold">بيانات استلام الاسترداد</h2>
          <p className="mb-3 text-xs leading-6 text-muted">أين تريد استلام المبلغ المسترد؟ تظهر هذه البيانات لفريق الإدارة فقط. لا ترسل كلمات مرور أو رموز تحقق أبدًا.</p>
          <ActionForm action={refundAccountAction} submitLabel="حفظ البيانات" variant="secondary" resetOnSuccess className="space-y-3">
            <Access order={order} token={token} phone={phone} />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="اسم صاحب الحساب"><Input name="holderName" required maxLength={120} /></Field>
              <Field label="الوسيلة"><Input name="methodLabel" required maxLength={80} placeholder="مثل: بنك فلسطين / محفظة" /></Field>
              <Field label="رقم الحساب أو المحفظة"><Input name="accountRef" dir="ltr" required maxLength={120} /></Field>
            </div>
          </ActionForm>
        </section>
      )}
      {canUpload && (
        <section>
          <h2 className="mb-1 text-base font-bold">رفع إثبات التحويل</h2>
          <p className="mb-4 text-xs leading-6 text-muted">بعد التحويل ارفع صورة الإيصال أو اكتب رقم الحوالة، ونرسل لك تأكيد استلام المبلغ بإشعار.</p>
          <ActionForm action={uploadProofAction} submitLabel="إرسال الإثبات" pendingLabel="جارٍ الرفع…" resetOnSuccess className="space-y-4">
            <Access order={order} token={token} phone={phone} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`المبلغ الذي حوّلته (${order.currency_code})`}>
                <Input name="declaredAmount" inputMode="decimal" dir="ltr" required defaultValue={remaining} />
              </Field>
              <Field label="رقم مرجع الحوالة (إن وجد)">
                <Input name="reference" dir="ltr" maxLength={120} />
              </Field>
            </div>
            <Field label="صورة الإيصال أو ملف PDF" hint="حتى 4 ميغابايت. لا ترسل كلمات مرور أو بيانات دخول بنكية أبدًا.">
              <input name="file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm file:me-3 file:rounded file:border-0 file:bg-sand file:px-3 file:py-2" />
            </Field>
            <Field label="ملاحظة (اختياري)"><Input name="note" maxLength={500} /></Field>
          </ActionForm>
        </section>
      )}
      {(freeCancel || requestCancel) && (
        <details className="group rounded-[var(--radius-card)] border border-line bg-paper px-4 py-3">
          <summary className="cursor-pointer list-none text-sm text-muted group-open:mb-3">تحتاج إلى إلغاء الطلب؟</summary>
          <h2 className="mb-1 text-base font-bold">{freeCancel && toMills(order.amount_collected) === 0 ? "إلغاء الطلب" : "طلب إلغاء"}</h2>
          <p className="mb-3 text-xs leading-6 text-muted">
            {freeCancel && toMills(order.amount_collected) === 0
              ? "يمكنك الإلغاء بضغطة لأنك لم تدفع بعد. وإن كنت حوّلت مبلغًا، نراجع طلبك ونعيده لك."
              : "سنراجع طلب الإلغاء وفق سياسة الإرجاع. أي استرداد يُسجّل كمعلّق حتى تنفيذه فعليًا."}
          </p>
          <ActionForm action={customerCancelAction} submitLabel={freeCancel ? "إلغاء الطلب" : "إرسال طلب الإلغاء"} variant="outline" confirm="هل تريد المتابعة في إلغاء الطلب؟" className="space-y-3">
            <Access order={order} token={token} phone={phone} />
            <Field label="السبب (اختياري)"><Input name="reason" maxLength={500} /></Field>
          </ActionForm>
        </details>
      )}
      {order.status === "delivered" && !openReturn && (
        <section>
          <h2 className="mb-3 text-base font-bold">طلب إرجاع أو استبدال</h2>
          <ActionForm action={requestReturnAction} submitLabel="إرسال الطلب" variant="secondary" className="space-y-3">
            <Access order={order} token={token} phone={phone} />
            <Field label="نوع الطلب">
              <Select name="kind" defaultValue="exchange">
                {Object.entries(t.returnKind).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Field>
            <Field label="التفاصيل (المنتج، المقاس المطلوب، المشكلة)"><Textarea name="reason" required minLength={5} maxLength={2000} /></Field>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
