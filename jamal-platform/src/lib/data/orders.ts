import "server-only";
import { asSystem, asUser, type Tx } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";

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

export type OrderDetail = OrderSummary & {
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  country_code: string;
  country_name: string;
  city: string;
  address_line: string;
  customer_notes: string | null;
  subtotal: string;
  shipping_cost: string;
  estimated_min_days: number | null;
  estimated_max_days: number | null;
  cancel_reason: string | null;
  items: { id: string; product_name: string; product_slug: string | null; variant_label: string | null; image_url: string | null; unit_price: string; quantity: number; line_total: string }[];
  events: { id: string; status: string | null; note: string | null; created_at: string }[];
  shipments: { status: string; carrier: string | null; tracking_number: string | null; tracking_url: string | null }[];
  returns: { id: string; status: string; reason: string; created_at: string }[];
};

const SUMMARY = `o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total::text, o.currency_code,
  o.created_at::text, o.is_test, (select coalesce(sum(quantity),0)::int from public.order_items i where i.order_id = o.id) as item_count`;

export async function listMyOrders(user: CurrentUser) {
  return asUser(user, (tx) =>
    tx.query<OrderSummary>(`select ${SUMMARY} from public.orders o where o.user_id = $1 order by o.created_at desc`, [user.id]),
  );
}

/** Loads one order; RLS decides visibility in user mode, the caller does in system mode. */
async function loadOrder(tx: Tx, where: string, params: unknown[], customerView: boolean): Promise<OrderDetail | null> {
  const [o] = await tx.query<Omit<OrderDetail, "items" | "events" | "shipments" | "returns">>(
    `select ${SUMMARY}, o.customer_name, o.customer_phone, o.customer_email, o.country_code, c.name_ar as country_name,
            o.city, o.address_line, o.customer_notes, o.subtotal::text, o.shipping_cost::text,
            o.estimated_min_days, o.estimated_max_days, o.cancel_reason
     from public.orders o join public.countries c on c.code = o.country_code
     where ${where}`,
    params,
  );
  if (!o) return null;
  const items = await tx.query<OrderDetail["items"][number]>(
    `select id, product_name, product_slug, variant_label, image_url, unit_price::text, quantity, line_total::text
     from public.order_items where order_id = $1 order by product_name`,
    [o.id],
  );
  const events = await tx.query<OrderDetail["events"][number]>(
    `select id, status, note, created_at::text from public.order_events
     where order_id = $1 ${customerView ? "and visible_to_customer" : ""} order by created_at`,
    [o.id],
  );
  const shipments = await tx.query<OrderDetail["shipments"][number]>(
    `select f.status, f.carrier, f.tracking_number, f.tracking_url from public.fulfillment_records f
     where f.order_id = $1 and f.status <> 'cancelled' and f.tracking_number is not null`,
    [o.id],
  );
  const returns = await tx.query<OrderDetail["returns"][number]>(
    "select id, status, reason, created_at::text from public.return_requests where order_id = $1 order by created_at",
    [o.id],
  );
  return { ...o, items, events, shipments, returns };
}

export async function getMyOrder(user: CurrentUser, orderNumber: string) {
  return asUser(user, async (tx) => {
    const order = await loadOrder(tx, "o.order_number = $1 and o.user_id = $2", [orderNumber, user.id], true);
    if (!order) return null;
    // Customers cannot read fulfillment_records (internal costs) — use the
    // SECURITY DEFINER function that exposes tracking fields only.
    order.shipments = (
      await tx.query<OrderDetail["shipments"][number]>(
        "select status, carrier, tracking_number, tracking_url from public.order_shipments($1) where tracking_number is not null",
        [order.id],
      )
    );
    return order;
  });
}

/** Guest tracking: requires both the order number and the phone used. */
export async function trackOrder(orderNumber: string, phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 7) return null;
  return asSystem((tx) =>
    loadOrder(
      tx,
      "o.order_number = $1 and regexp_replace(o.customer_phone, '[^0-9]', '', 'g') = $2",
      [orderNumber.trim().toUpperCase(), digits],
      true,
    ),
  );
}
