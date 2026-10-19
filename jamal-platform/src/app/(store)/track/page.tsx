import type { Metadata } from "next";
import { Suspense } from "react";
import { getCustomerOrder } from "@/lib/data/orders";
import { CustomerOrderActions } from "@/components/orders/CustomerOrderActions";
import { rateLimit } from "@/lib/rate-limit";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Notice, Skeleton } from "@/components/ui/States";
import { OrderDetailView } from "@/components/orders/OrderParts";

export const metadata: Metadata = { title: "تتبع الطلب", robots: { index: false } };

async function Content({ searchParams }: { searchParams: PageProps<"/track">["searchParams"] }) {
  const sp = await searchParams;
  const number = typeof sp.n === "string" ? sp.n.slice(0, 40) : "";
  const phone = typeof sp.p === "string" ? sp.p.slice(0, 30) : "";
  let order = null;
  let limited = false;
  if (number && phone) {
    limited = !(await rateLimit("track", 20, 15 * 60_000));
    if (!limited) order = await getCustomerOrder({ number, phone });
  }
  return (
    <>
      <form action="/track" method="get" className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="رقم الطلب" htmlFor="n">
          <Input id="n" name="n" required dir="ltr" className="text-end font-mono uppercase" defaultValue={number} placeholder="JM261016-XXXXXX" />
        </Field>
        <Field label="رقم الهاتف" htmlFor="p">
          <Input id="p" name="p" type="tel" required dir="ltr" className="text-end" defaultValue={phone} />
        </Field>
        <Button type="submit" className="h-[2.85rem]">تتبع</Button>
      </form>
      <div className="mt-10">
        {limited && <Notice tone="error">محاولات كثيرة. حاول بعد قليل.</Notice>}
        {number && phone && !limited && !order && <Notice tone="warning">لم نجد طلبًا بهذه البيانات. تأكد من رقم الطلب ورقم الهاتف.</Notice>}
        {order && <OrderDetailView order={order} actions={<CustomerOrderActions order={order} phone={phone} />} />}
      </div>
    </>
  );
}

export default function TrackPage({ searchParams }: PageProps<"/track">) {
  return (
    <div className="container-page max-w-3xl py-8 md:py-12">
      <h1 className="mb-2 text-2xl font-bold md:text-3xl">تتبع الطلب</h1>
      <p className="mb-8 text-sm text-muted">أدخل رقم الطلب ورقم الهاتف المستخدم عند الطلب.</p>
      <Suspense fallback={<Skeleton className="h-24 w-full" />}>
        <Content searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
