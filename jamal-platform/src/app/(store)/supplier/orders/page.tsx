import type { Metadata } from "next";
import { Suspense } from "react";
import { requireSupplier } from "@/lib/auth";
import { supplierOrders } from "@/lib/data/supplier";
import { supplierFulfillmentAction } from "@/lib/actions/supplier";
import { label, t } from "@/lib/i18n/ar";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, Input } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "طلبات منتجاتي", robots: { index: false } };

const fmt = (s: string) => new Intl.DateTimeFormat("ar-u-nu-latn", { dateStyle: "medium" }).format(new Date(s));

async function List() {
  const { supplier } = await requireSupplier();
  const orders = await supplierOrders(supplier.id);
  if (!orders.length) {
    return <p className="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center text-sm text-muted">لا توجد طلبات بعد. تصلك هنا فور تأكيد دفع العميل، مع إشعار على جوالك.</p>;
  }
  return (
    <ul className="space-y-3">
      {orders.map((o) => (
        <li key={o.fulfillment_id} className="space-y-3 rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="ltr font-mono text-sm font-bold">{o.order_number}</p>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs">{label(t.fulfillmentStatus, o.status)}</span>
          </div>
          <p className="text-xs text-muted">{fmt(o.created_at)} · {o.governorate_name ?? ""}</p>
          <ul className="text-sm">
            {o.items.map((i, k) => <li key={k}>{i.name}{i.variant ? ` — ${i.variant}` : ""} × {i.quantity}</li>)}
          </ul>
          {o.customer_name && (
            <div className="rounded-2xl bg-ivory p-3 text-sm leading-7">
              <p className="font-semibold">التوصيل إلى</p>
              <p>{o.customer_name} · <a href={`tel:${o.customer_phone}`} className="ltr underline">{o.customer_phone}</a></p>
              <p>{o.governorate_name} — {o.city} — {o.address_line}</p>
            </div>
          )}
          {o.tracking_number && <p className="text-xs text-muted">التتبع: {o.carrier} {o.tracking_number}</p>}
          {o.status === "sent_to_supplier" && (
            <ActionForm action={supplierFulfillmentAction} submitLabel="قبول الطلب" size="sm" className="">
              <input type="hidden" name="id" value={o.fulfillment_id} />
              <input type="hidden" name="status" value="supplier_accepted" />
            </ActionForm>
          )}
          {(o.status === "supplier_accepted" || o.status === "preparing") && (
            <ActionForm action={supplierFulfillmentAction} submitLabel="تم الشحن" size="sm" className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={o.fulfillment_id} />
              <input type="hidden" name="status" value="shipped" />
              <Field label="شركة التوصيل"><Input name="carrier" maxLength={80} /></Field>
              <Field label="رقم التتبع (إن وجد)"><Input name="tracking" maxLength={80} dir="ltr" className="text-end" /></Field>
            </ActionForm>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">طلبات منتجاتي</h1>
      <Suspense fallback={<Skeleton className="h-60 w-full" />}><List /></Suspense>
    </div>
  );
}
