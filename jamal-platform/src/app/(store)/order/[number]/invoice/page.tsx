import type { Metadata } from "next";
import { Suspense } from "react";
import { resolveOrderAccess } from "@/lib/data/orders";
import { getInvoiceByOrder } from "@/lib/data/invoices";
import { InvoiceView } from "@/components/invoices/InvoiceView";
import { EmptyState, Skeleton } from "@/components/ui/States";

export const metadata: Metadata = { title: "الفاتورة", robots: { index: false, follow: false } };

async function Content({ params, searchParams }: PageProps<"/order/[number]/invoice">) {
  const [{ number }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t.slice(0, 100) : null;
  const orderId = await resolveOrderAccess({ number: decodeURIComponent(number), token });
  const inv = orderId ? await getInvoiceByOrder(orderId) : null;
  if (!inv) return <EmptyState title="لا توجد فاتورة" description="تصدر الفاتورة تلقائيًا بعد تأكيد وصول الدفع." />;
  return <InvoiceView inv={inv} />;
}

export default function Page(props: PageProps<"/order/[number]/invoice">) {
  return (
    <div className="container-page py-8 print:p-0">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}><Content {...props} /></Suspense>
    </div>
  );
}
