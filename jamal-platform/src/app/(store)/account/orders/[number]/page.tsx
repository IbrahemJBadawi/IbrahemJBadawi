import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMyOrder } from "@/lib/data/orders";
import { cancelMyOrderAction, requestReturnAction } from "@/lib/actions/account";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, Textarea } from "@/components/ui/Field";
import { OrderDetailView } from "@/components/orders/OrderParts";

export const metadata: Metadata = { title: "تفاصيل الطلب", robots: { index: false } };

export const instant = false;

export default async function MyOrderPage({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const order = await getMyOrder(user, decodeURIComponent(number));
  if (!order) notFound();
  const openReturn = order.returns.some((r) => r.status === "requested" || r.status === "approved");
  return (
    <OrderDetailView
      order={order}
      actions={
        <div className="space-y-6 border-t border-line pt-6">
          {order.status === "pending" && (
            <ActionForm action={cancelMyOrderAction} submitLabel="إلغاء الطلب" variant="outline" confirm="هل تريد إلغاء هذا الطلب؟">
              <input type="hidden" name="orderNumber" value={order.order_number} />
              <p className="text-sm text-muted">يمكنك إلغاء الطلب ما دام قيد المراجعة.</p>
            </ActionForm>
          )}
          {order.status === "delivered" && !openReturn && (
            <ActionForm action={requestReturnAction} submitLabel="إرسال طلب الإرجاع" variant="secondary">
              <input type="hidden" name="orderNumber" value={order.order_number} />
              <h2 className="text-base font-bold">طلب إرجاع أو استبدال</h2>
              <Field label="سبب الإرجاع والمنتجات المعنية" htmlFor="reason">
                <Textarea id="reason" name="reason" required minLength={5} maxLength={2000} />
              </Field>
            </ActionForm>
          )}
        </div>
      }
    />
  );
}
