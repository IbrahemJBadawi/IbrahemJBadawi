import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CheckCircle2 } from "lucide-react";
import { asSystem } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { t } from "@/lib/i18n/ar";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/States";

export const metadata: Metadata = { title: "تم استلام طلبك", robots: { index: false } };

// Auth-gated: rendering waits for the session (redirects to login otherwise).
export const instant = false;

export default async function ConfirmationPage() {
  const id = (await cookies()).get("jamal_last_order")?.value;
  const order =
    id && /^[0-9a-f-]{36}$/.test(id)
      ? await asSystem(async (tx) => {
          const [o] = await tx.query<{ order_number: string; total: string; currency_code: string; payment_method: string; user_id: string | null; is_test: boolean; estimated_min_days: number | null; estimated_max_days: number | null }>(
            `select order_number, total::text, currency_code, payment_method, user_id, is_test, estimated_min_days, estimated_max_days
             from public.orders where id = $1`,
            [id],
          );
          return o ?? null;
        })
      : null;

  if (!order) {
    return (
      <div className="container-page py-16">
        <EmptyState title="لا يوجد طلب حديث لعرضه" description="يمكنك متابعة طلباتك من صفحة «طلباتي» أو «تتبع الطلب»." action={<ButtonLink href="/track">تتبع الطلب</ButtonLink>} />
      </div>
    );
  }
  return (
    <div className="container-page max-w-2xl py-14 text-center">
      <CheckCircle2 className="mx-auto size-14 text-success" strokeWidth={1.4} />
      <h1 className="mt-6 text-2xl font-bold md:text-3xl">شكرًا لك، تم استلام طلبك</h1>
      <p className="mt-3 text-muted">رقم الطلب</p>
      <p className="ltr mt-1 font-mono text-2xl font-bold tracking-wider">{order.order_number}</p>
      {order.is_test && <p className="mt-4 text-sm font-semibold text-warning">هذا طلب اختبار لأنه يحتوي على منتجات تجريبية.</p>}
      <div className="mx-auto mt-8 max-w-md space-y-2 rounded-[var(--radius-card)] border border-line bg-paper p-6 text-start text-sm">
        <p className="flex justify-between"><span className="text-muted">الإجمالي</span><strong>{formatMoney(order.total, order.currency_code)}</strong></p>
        <p className="flex justify-between"><span className="text-muted">طريقة الطلب</span><span>{order.payment_method === "cod" ? t.paymentMethod.cod : "طلب يدوي"}</span></p>
        {order.estimated_min_days != null && (
          <p className="flex justify-between"><span className="text-muted">التوصيل المتوقع بعد التأكيد</span><span>{order.estimated_min_days}–{order.estimated_max_days} يوم عمل</span></p>
        )}
      </div>
      <p className="mx-auto mt-6 max-w-md text-sm leading-7 text-muted">
        طلبك الآن «قيد المراجعة». سنتواصل معك على رقم هاتفك لتأكيده. احتفظ برقم الطلب لمتابعته.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {order.user_id ? <ButtonLink href="/account/orders">طلباتي</ButtonLink> : <ButtonLink href="/track">تتبع الطلب</ButtonLink>}
        <ButtonLink href="/products" variant="outline">متابعة التسوق</ButtonLink>
      </div>
    </div>
  );
}
