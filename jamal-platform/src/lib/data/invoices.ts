import "server-only";
import { asSystem } from "@/lib/db";

export type Invoice = {
  id: string; invoice_no: string; order_number: string; customer_name: string; customer_phone: string; address_ar: string;
  currency_code: string; lines: { name: string; variant: string | null; qty: number; unit: string; total: string }[];
  subtotal: string; discount_total: string; shipping_cost: string; fees_total: string; fees_label: string | null; total: string;
  amount_paid: string; payment_method: string; payment_reference: string | null; seller_name: string | null; seller_tax_number: string | null;
  status: string; refunded_amount: string; issued_at: string; refunded_at: string | null; footer: string | null; store_phone: string | null;
};

/** Loads an invoice by order id. Callers must have verified access to the order first. */
export async function getInvoiceByOrder(orderId: string) {
  const [inv] = await asSystem((tx) =>
    tx.query<Invoice>(
      `select i.id, i.invoice_no, o.order_number, i.customer_name, i.customer_phone, i.address_ar, i.currency_code, i.lines,
              i.subtotal::text, i.discount_total::text, i.shipping_cost::text, i.fees_total::text, i.fees_label, i.total::text,
              i.amount_paid::text, i.payment_method, i.payment_reference, i.seller_name, i.seller_tax_number, i.status,
              i.refunded_amount::text, i.issued_at::text, i.refunded_at::text, s.invoice_footer as footer, s.contact_phone as store_phone
       from public.invoices i join public.orders o on o.id = i.order_id cross join public.store_settings s
       where i.order_id = $1 and s.id = 1`,
      [orderId],
    ),
  );
  return inv ?? null;
}
