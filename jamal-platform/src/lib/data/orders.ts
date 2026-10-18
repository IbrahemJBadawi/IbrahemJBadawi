import "server-only";
import { timingSafeEqual } from "node:crypto";
import { asSystem, asUser, type Tx } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

export type OrderSummary = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total: string;
  currency_code: string;
  created_at: string;
  item_count: number;
  is_test: boolean;
};

export type PaymentInstructions = {
  enabled: boolean;
  beneficiary_name: string | null;
  bank_name: string | null;
  transfer_details: string | null;
  instructions: string | null;
  proof_review_policy: string | null;
  contact: string | null;
};

/** Everything a customer may see about their order — never supplier costs or internal notes. */
export type OrderDetail = OrderSummary & {
  customer_name: string;
  customer_phone: string;
  country_name: string;
  governorate_name: string | null;
  city: string;
  address_line: string;
  customer_notes: string | null;
  subtotal: string;
  discount_total: string;
  shipping_cost: string;
  fees_total: string;
  fees_label: string | null;
  amount_collected: string;
  price_approved_at: string | null;
  payment_due_at: string | null;
  estimated_min_days: number | null;
  estimated_max_days: number | null;
  cancel_reason: string | null;
  items: { id: string; product_name: string; product_slug: string | null; variant_label: string | null; image_url: string | null; unit_price: string; quantity: number; line_total: string }[];
  events: { id: string; status: string | null; note: string | null; created_at: string }[];
  shipments: { status: string; carrier: string | null; tracking_number: string | null; tracking_url: string | null }[];
  returns: { id: string; status: string; kind: string; reason: string; created_at: string }[];
  proofs: { id: string; declared_amount: string; status: string; rejection_reason: string | null; created_at: string }[];
  refunds: { id: string; amount: string; status: string; reason: string; completed_at: string | null }[];
  payment: PaymentInstructions | null;
};

const SUMMARY = `o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total::text, o.currency_code,
  o.created_at::text, o.is_test, (select coalesce(sum(quantity),0)::int from public.order_items i where i.order_id = o.id) as item_count`;

export async function listMyOrders(user: CurrentUser) {
  return asUser(user, (tx) =>
    tx.query<OrderSummary>(`select ${SUMMARY} from public.orders o where o.user_id = $1 order by o.created_at desc`, [user.id]),
  );
}

async function loadOrder(tx: Tx, orderId: string): Promise<OrderDetail | null> {
  const [o] = await tx.query<Omit<OrderDetail, "items" | "events" | "shipments" | "returns" | "proofs" | "refunds" | "payment">>(
    `select ${SUMMARY}, o.customer_name, o.customer_phone, c.name_ar as country_name, o.governorate_name,
            o.city, o.address_line, o.customer_notes, o.subtotal::text, o.discount_total::text, o.shipping_cost::text,
            o.fees_total::text, o.fees_label, o.amount_collected::text, o.price_approved_at::text, o.payment_due_at::text,
            o.estimated_min_days, o.estimated_max_days, o.cancel_reason
     from public.orders o join public.countries c on c.code = o.country_code
     where o.id = $1`,
    [orderId],
  );
  if (!o) return null;
  const [items, events, shipments, returns, proofs, refunds] = [
    await tx.query<OrderDetail["items"][number]>(
      `select id, product_name, product_slug, variant_label, image_url, unit_price::text, quantity, line_total::text
       from public.order_items where order_id = $1 order by product_name`, [o.id]),
    await tx.query<OrderDetail["events"][number]>(
      "select id, status, note, created_at::text from public.order_events where order_id = $1 and visible_to_customer order by created_at", [o.id]),
    await tx.query<OrderDetail["shipments"][number]>(
      `select status, carrier, tracking_number, tracking_url from public.fulfillment_records
       where order_id = $1 and status <> 'cancelled' and (tracking_number is not null or carrier is not null)`, [o.id]),
    await tx.query<OrderDetail["returns"][number]>(
      "select id, status, kind, reason, created_at::text from public.return_requests where order_id = $1 order by created_at", [o.id]),
    await tx.query<OrderDetail["proofs"][number]>(
      "select id, declared_amount::text, status, rejection_reason, created_at::text from public.payment_proofs where order_id = $1 and source = 'customer' order by created_at", [o.id]),
    await tx.query<OrderDetail["refunds"][number]>(
      "select id, amount::text, status, reason, completed_at::text from public.refunds where order_id = $1 and status <> 'cancelled' order by created_at", [o.id]),
  ];
  // Bank details are disclosed only once the price is approved and payment is expected.
  let payment: PaymentInstructions | null = null;
  if (["awaiting_payment", "payment_review"].includes(o.status) && o.payment_method === "bank_transfer") {
    const [p] = await tx.query<PaymentInstructions>(
      `select bank_transfer_enabled as enabled, beneficiary_name, bank_name, transfer_details, instructions, proof_review_policy, contact
       from public.payment_settings where id = 1`,
    );
    payment = p ?? null;
  }
  return { ...o, items, events, shipments, returns, proofs, refunds, payment };
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export type OrderAccess = { number: string; token?: string | null; phone?: string | null };

/**
 * Resolves which order the visitor may access: the signed-in owner, the
 * private link token, or order number + the phone used for the order.
 */
export async function resolveOrderAccess(access: OrderAccess): Promise<string | null> {
  const number = access.number.trim().toUpperCase().slice(0, 40);
  if (!number) return null;
  const [o] = await asSystem((tx) =>
    tx.query<{ id: string; user_id: string | null; access_token: string | null; customer_phone: string }>(
      "select id, user_id, access_token, customer_phone from public.orders where order_number = $1",
      [number],
    ),
  );
  if (!o) return null;
  if (access.token && o.access_token && safeEqual(access.token, o.access_token)) return o.id;
  if (access.phone) {
    const digits = access.phone.replace(/[^0-9]/g, "");
    if (digits.length >= 7 && digits === o.customer_phone.replace(/[^0-9]/g, "")) return o.id;
  }
  const user = await getCurrentUser();
  if (user && o.user_id === user.id) return o.id;
  return null;
}

export async function getCustomerOrder(access: OrderAccess) {
  const id = await resolveOrderAccess(access);
  if (!id) return null;
  return asSystem((tx) => loadOrder(tx, id));
}
