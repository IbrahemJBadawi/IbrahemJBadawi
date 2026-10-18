import { customerCancelAction, requestReturnAction, uploadProofAction } from "@/lib/actions/order";
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
  return (
    <div className="space-y-8 border-t border-line pt-6">
      {canUpload && (
        <section>
          <h2 className="mb-1 text-base font-bold">رفع إثبات التحويل</h2>
          <p className="mb-4 text-xs leading-6 text-muted">بعد التحويل ارفع صورة الإيصال أو اكتب رقم مرجع الحوالة. رفع الإثبات لا يعني تأكيد الدفع؛ نؤكده بعد التحقق من وصول المبلغ.</p>
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
        <section>
          <h2 className="mb-1 text-base font-bold">{freeCancel && toMills(order.amount_collected) === 0 ? "إلغاء الطلب" : "طلب إلغاء"}</h2>
          <p className="mb-3 text-xs leading-6 text-muted">
            {freeCancel && toMills(order.amount_collected) === 0
              ? "يمكنك الإلغاء مباشرة لأنك لم تدفع بعد. إذا كنت قد حوّلت مبلغًا ولم نؤكده بعد، سيُرسل كطلب إلغاء للمراجعة."
              : "سنراجع طلب الإلغاء وفق سياسة الإرجاع. أي استرداد يُسجّل كمعلّق حتى تنفيذه فعليًا."}
          </p>
          <ActionForm action={customerCancelAction} submitLabel={freeCancel ? "إلغاء الطلب" : "إرسال طلب الإلغاء"} variant="outline" confirm="هل تريد المتابعة في إلغاء الطلب؟" className="space-y-3">
            <Access order={order} token={token} phone={phone} />
            <Field label="السبب (اختياري)"><Input name="reason" maxLength={500} /></Field>
          </ActionForm>
        </section>
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
