"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { asSystem } from "@/lib/db";
import { getCustomerTicket } from "@/lib/data/tickets";
import { rateLimit } from "@/lib/rate-limit";
import { createTicket, customerClose, customerReply, TICKET_CATEGORIES, TicketError } from "@/lib/support/tickets";
import type { FormState } from "./account";

const schema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  subject: z.string().trim().min(3, "اكتب عنوانًا مختصرًا").max(160),
  body: z.string().trim().min(10, "اشرح المشكلة بتفصيل أكثر (10 أحرف على الأقل)").max(4000),
  orderNumber: z.string().trim().max(40),
  guestName: z.string().trim().max(80),
  guestPhone: z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "رقم الهاتف غير صالح")]),
});

export async function createTicketAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("ticket", 5, 60 * 60_000))) return { error: "فتحت تذاكر كثيرة. حاول لاحقًا." };
  const p = schema.safeParse(Object.fromEntries(["category", "subject", "body", "orderNumber", "guestName", "guestPhone"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { fieldErrors: z.flattenError(p.error).fieldErrors };
  const user = await getCurrentUser();
  let created: { code: string; token: string | null };
  try {
    created = await asSystem((tx) =>
      createTicket(tx, {
        userId: user?.id ?? null, guestName: p.data.guestName || null, guestPhone: p.data.guestPhone || null,
        orderNumber: p.data.orderNumber || null, category: p.data.category, subject: p.data.subject, body: p.data.body,
      }),
    );
  } catch (e) {
    if (e instanceof TicketError) return { error: e.message };
    console.error(e);
    return { error: "تعذّر فتح التذكرة بسبب خطأ مؤقت. حاول مرة أخرى." };
  }
  redirect(created.token ? `/support/${created.code}?t=${created.token}&new=1` : `/support/${created.code}?new=1`);
}

async function ticketFromForm(form: FormData) {
  const code = String(form.get("code") ?? "");
  const token = String(form.get("t") ?? "") || null;
  return getCustomerTicket(code, token);
}

export async function customerReplyAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("ticket-reply", 30, 60 * 60_000))) return { error: "رسائل كثيرة. حاول لاحقًا." };
  const t = await ticketFromForm(form);
  if (!t) return { error: "لا يمكن الوصول إلى هذه التذكرة." };
  const body = String(form.get("body") ?? "").trim();
  if (body.length < 2 || body.length > 4000) return { fieldErrors: { body: ["اكتب رسالتك"] } };
  const user = await getCurrentUser();
  await asSystem((tx) => customerReply(tx, t.id, user?.id ?? null, body));
  refresh();
  return { ok: true, message: "تم إرسال رسالتك." };
}

export async function customerCloseAction(_: FormState, form: FormData): Promise<FormState> {
  const t = await ticketFromForm(form);
  if (!t) return { error: "لا يمكن الوصول إلى هذه التذكرة." };
  const user = await getCurrentUser();
  await asSystem((tx) => customerClose(tx, t.id, user?.id ?? null));
  refresh();
  return { ok: true, message: "تم إغلاق التذكرة. يمكنك إعادة فتحها بإرسال رسالة جديدة." };
}
