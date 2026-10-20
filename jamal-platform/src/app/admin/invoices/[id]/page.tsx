import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getInvoiceByOrder } from "@/lib/data/invoices";
import { InvoiceView } from "@/components/invoices/InvoiceView";

export const metadata = { title: "فاتورة" };

export default async function AdminInvoice({ params }: PageProps<"/admin/invoices/[id]">) {
  const { id } = await params;
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const inv = await getInvoiceByOrder(id);
  if (!inv) notFound();
  return <InvoiceView inv={inv} />;
}
