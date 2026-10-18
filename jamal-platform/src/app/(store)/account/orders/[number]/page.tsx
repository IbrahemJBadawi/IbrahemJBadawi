import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCustomerOrder } from "@/lib/data/orders";
import { OrderDetailView } from "@/components/orders/OrderParts";
import { CustomerOrderActions } from "@/components/orders/CustomerOrderActions";

export const metadata: Metadata = { title: "تفاصيل الطلب", robots: { index: false } };

export const instant = false;

export default async function MyOrderPage({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  await requireUser(`/account/orders/${number}`);
  // Access = signed-in owner (verified inside getCustomerOrder).
  const order = await getCustomerOrder({ number: decodeURIComponent(number) });
  if (!order) notFound();
  return <OrderDetailView order={order} actions={<CustomerOrderActions order={order} />} />;
}
