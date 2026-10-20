/**
 * Support tickets (TechMood model): a conversation between a customer and
 * staff with internal notes and an event log. Framework-free, runs in the
 * caller's transaction. Customer functions run in system scope only after
 * the server verified ownership (session or private ticket token).
 */
import { randomBytes } from "node:crypto";
import type { Tx } from "@/lib/db/core";

export class TicketError extends Error {}
const fail = (m: string): never => {
  throw new TicketError(m);
};

export const TICKET_CATEGORIES = ["order", "payment", "delivery", "return", "product", "account", "other"] as const;
export const TICKET_STATUSES = ["open", "waiting_staff", "waiting_customer", "resolved", "closed"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export async function createTicket(
  tx: Tx,
  input: {
    userId: string | null; guestName: string | null; guestPhone: string | null; orderNumber: string | null;
    category: string; subject: string; body: string;
  },
) {
  if (!input.userId && (!input.guestName || !input.guestPhone)) fail("أدخل اسمك ورقم هاتفك للتواصل معك.");
  // Link an order only if it belongs to the requester (account or same phone).
  let orderId: string | null = null;
  if (input.orderNumber) {
    const [o] = await tx.query<{ id: string; user_id: string | null; customer_phone: string }>(
      "select id, user_id, customer_phone from public.orders where order_number = $1",
      [input.orderNumber.trim().toUpperCase()],
    );
    const digits = (s: string | null) => (s ?? "").replace(/[^0-9]/g, "");
    if (o && ((input.userId && o.user_id === input.userId) || (input.guestPhone && digits(o.customer_phone) === digits(input.guestPhone)))) orderId = o.id;
  }
  const token = input.userId ? null : randomBytes(24).toString("base64url");
  const priority = input.category === "payment" ? "high" : "normal";
  const [t] = await tx.query<{ id: string; code: string }>(
    `insert into public.support_tickets (user_id, guest_name, guest_phone, access_token, order_id, category, subject_ar, priority, status)
     values ($1,$2,$3,$4,$5,$6,$7,$8,'open') returning id, code`,
    [input.userId, input.userId ? null : input.guestName, input.userId ? null : input.guestPhone, token, orderId, input.category, input.subject, priority],
  );
  await tx.query(
    "insert into public.ticket_messages (ticket_id, author_kind, author_id, body_ar) values ($1, 'customer', $2, $3)",
    [t.id, input.userId, input.body],
  );
  await tx.query("insert into public.ticket_events (ticket_id, kind, actor_id, note_ar, is_internal) values ($1, 'created', $2, $3, false)", [t.id, input.userId, "تم فتح التذكرة"]);
  return { id: t.id, code: t.code, token };
}

export async function customerReply(tx: Tx, ticketId: string, authorId: string | null, body: string) {
  const [t] = await tx.query<{ status: string }>("select status from public.support_tickets where id = $1 for update", [ticketId]);
  if (!t) fail("التذكرة غير موجودة.");
  await tx.query("insert into public.ticket_messages (ticket_id, author_kind, author_id, body_ar) values ($1, 'customer', $2, $3)", [ticketId, authorId, body]);
  // A customer reply (re)opens the ticket for staff.
  await tx.query("update public.support_tickets set status = 'waiting_staff', resolved_at = null where id = $1", [ticketId]);
  if (["resolved", "closed"].includes(t.status)) {
    await tx.query("insert into public.ticket_events (ticket_id, kind, actor_id, note_ar, is_internal) values ($1, 'reopened', $2, 'أعاد العميل فتح التذكرة', false)", [ticketId, authorId]);
  }
}

export async function customerClose(tx: Tx, ticketId: string, authorId: string | null) {
  await tx.query("update public.support_tickets set status = 'closed', resolved_at = coalesce(resolved_at, now()) where id = $1", [ticketId]);
  await tx.query("insert into public.ticket_events (ticket_id, kind, actor_id, note_ar, is_internal) values ($1, 'closed', $2, 'أغلق العميل التذكرة', false)", [ticketId, authorId]);
}

export async function staffReply(tx: Tx, adminId: string, ticketId: string, body: string, internal: boolean) {
  const [t] = await tx.query<{ id: string }>("select id from public.support_tickets where id = $1 for update", [ticketId]);
  if (!t) fail("التذكرة غير موجودة.");
  await tx.query(
    "insert into public.ticket_messages (ticket_id, author_kind, author_id, body_ar, is_internal) values ($1, 'staff', $2, $3, $4)",
    [ticketId, adminId, body, internal],
  );
  if (!internal) {
    await tx.query("update public.support_tickets set status = 'waiting_customer', assigned_to = coalesce(assigned_to, $2) where id = $1", [ticketId, adminId]);
  }
}

export async function updateTicket(tx: Tx, adminId: string, ticketId: string, d: { status: string; priority: string; assignToMe: boolean }) {
  const [t] = await tx.query<{ status: string; priority: string }>("select status, priority from public.support_tickets where id = $1 for update", [ticketId]);
  if (!t) fail("التذكرة غير موجودة.");
  await tx.query(
    `update public.support_tickets set status = $1, priority = $2,
       resolved_at = case when $1 in ('resolved','closed') then coalesce(resolved_at, now()) else null end,
       assigned_to = case when $3 then $4::uuid else assigned_to end
     where id = $5`,
    [d.status, d.priority, d.assignToMe, adminId, ticketId],
  );
  if (t.status !== d.status) {
    await tx.query(
      "insert into public.ticket_events (ticket_id, kind, actor_id, note_ar, is_internal) values ($1, 'status', $2, $3, false)",
      [ticketId, adminId, `تغيرت حالة التذكرة إلى: ${d.status}`],
    );
  }
}
