import "server-only";
import { timingSafeEqual } from "node:crypto";
import { asSystem, asUser } from "@/lib/db";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

export type TicketSummary = { id: string; code: string; subject_ar: string; category: string; status: string; priority: string; updated_at: string; order_number: string | null };
export type TicketMessage = { id: string; author_kind: string; body_ar: string; is_internal: boolean; created_at: string; author: string | null };
export type TicketDetail = TicketSummary & { guest_name: string | null; guest_phone: string | null; messages: TicketMessage[] };

export async function listMyTickets(user: CurrentUser) {
  return asUser(user, (tx) =>
    tx.query<TicketSummary>(
      `select t.id, t.code, t.subject_ar, t.category, t.status, t.priority, t.updated_at::text, o.order_number
       from public.support_tickets t left join public.orders o on o.id = t.order_id
       where t.user_id = $1 order by t.updated_at desc`,
      [user.id],
    ),
  );
}

/** Ticket for a customer: the signed-in owner, or the private guest token. Internal notes are never returned. */
export async function getCustomerTicket(code: string, token: string | null): Promise<TicketDetail | null> {
  const [t] = await asSystem((tx) =>
    tx.query<TicketSummary & { user_id: string | null; access_token: string | null; guest_name: string | null; guest_phone: string | null }>(
      `select t.id, t.code, t.subject_ar, t.category, t.status, t.priority, t.updated_at::text, o.order_number, t.user_id, t.access_token,
              t.guest_name, t.guest_phone
       from public.support_tickets t left join public.orders o on o.id = t.order_id where t.code = $1`,
      [code.toUpperCase().slice(0, 20)],
    ),
  );
  if (!t) return null;
  const tokenOk = !!token && !!t.access_token && token.length === t.access_token.length && timingSafeEqual(Buffer.from(token), Buffer.from(t.access_token));
  const user = tokenOk ? null : await getCurrentUser();
  if (!tokenOk && !(user && t.user_id === user.id)) return null;
  const messages = await asSystem((tx) =>
    tx.query<TicketMessage>(
      `select id, author_kind, body_ar, is_internal, created_at::text, null as author
       from public.ticket_messages where ticket_id = $1 and not is_internal order by created_at`,
      [t.id],
    ),
  );
  const { user_id: _u, access_token: _a, ...rest } = t;
  void _u; void _a;
  return { ...rest, messages };
}
