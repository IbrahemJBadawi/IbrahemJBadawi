import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { resolveOrderAccess } from "@/lib/data/orders";
import { getInvoiceByOrder } from "@/lib/data/invoices";
import { InvoiceView } from "@/components/invoices/InvoiceView";

export const metadata: Metadata = { title: "الفاتورة", robots: { index: false } };
export const instant = false;

export default async function Page({ params }: PageProps<"/account/orders/[number]/invoice">) {
  const { number } = await params;
  await requireUser(`/account/orders/${number}/invoice`);
  const orderId = await resolveOrderAccess({ number: decodeURIComponent(number) });
  const inv = orderId ? await getInvoiceByOrder(orderId) : null;
  if (!inv) notFound();
  return <InvoiceView inv={inv} />;
}
