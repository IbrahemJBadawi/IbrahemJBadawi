import type { Metadata } from "next";
import { Suspense } from "react";
import { getCustomerOrder } from "@/lib/data/orders";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Notice, Skeleton } from "@/components/ui/States";
import { OrderDetailView } from "@/components/orders/OrderParts";
import { CustomerOrderActions } from "@/components/orders/CustomerOrderActions";
import { CopyButton } from "@/components/admin/CopyButton";

export const metadata: Metadata = { title: "طلبي", robots: { index: false, follow: false } };

async function Content({ params, searchParams }: PageProps<"/order/[number]">) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t.slice(0, 100) : null;
  const order = await getCustomerOrder({ number: decodeURIComponent(number), token });
  if (!order) {
    return <EmptyState title="لا يمكن عرض هذا الطلب" description="تأكد من الرابط، أو استخدم صفحة «تتبع الطلب» برقم الطلب ورقم الهاتف." action={<ButtonLink href="/track">تتبع الطلب</ButtonLink>} />;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  return (
    <>
      {sp.new === "1" && (
        <div className="mb-8 space-y-3">
          <Notice tone="success">شكرًا لك، تم استلام طلبك. احفظ رابط هذه الصفحة لمتابعة الطلب والدفع.</Notice>
          {token && <CopyButton text={`${site}/order/${order.order_number}?t=${token}`} label="نسخ رابط الطلب" />}
        </div>
      )}
      <OrderDetailView order={order} actions={<CustomerOrderActions order={order} token={token} />} />
    </>
  );
}

export default function OrderPage(props: PageProps<"/order/[number]">) {
  return (
    <div className="container-page max-w-3xl py-8 md:py-12">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}
