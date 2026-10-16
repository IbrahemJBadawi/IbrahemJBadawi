"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asSystem, asUser } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

export type FormState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string[] | undefined> };

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  phone: z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "رقم الهاتف غير صالح")]),
});

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ fullName: form.get("fullName"), phone: form.get("phone") ?? "" });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  // Column privileges only allow full_name/phone; RLS limits it to the user's own row.
  await asUser(user, (tx) =>
    tx.query("update public.profiles set full_name = $1, phone = $2 where id = $3", [parsed.data.fullName, parsed.data.phone || null, user.id]),
  );
  refresh();
  return { ok: true, message: "تم حفظ بياناتك." };
}

export async function cancelMyOrderAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const number = String(form.get("orderNumber") ?? "");
  // Customers have no UPDATE privilege on orders through RLS; the server
  // performs the change after checking ownership and status explicitly.
  const done = await asSystem(async (tx) => {
    const rows = await tx.query<{ id: string }>(
      `update public.orders set status = 'cancelled', cancel_reason = 'ألغاه العميل'
       where order_number = $1 and user_id = $2 and status = 'pending' returning id`,
      [number, user.id],
    );
    if (!rows[0]) return false;
    await tx.query("update public.fulfillment_records set status = 'cancelled' where order_id = $1 and status = 'pending'", [rows[0].id]);
    await tx.query(
      "insert into public.order_events (order_id, status, note, actor_id) values ($1, 'cancelled', 'ألغى العميل الطلب', $2)",
      [rows[0].id, user.id],
    );
    return true;
  });
  if (!done) return { error: "لا يمكن إلغاء هذا الطلب الآن. تواصل معنا للمساعدة." };
  refresh();
  return { ok: true, message: "تم إلغاء الطلب." };
}

export async function requestReturnAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await rateLimit("return", 5, 60 * 60_000))) return { error: "محاولات كثيرة. حاول لاحقًا." };
  const reason = String(form.get("reason") ?? "").trim();
  if (reason.length < 5 || reason.length > 2000) return { fieldErrors: { reason: ["يرجى توضيح السبب (5 أحرف على الأقل)"] } };
  const number = String(form.get("orderNumber") ?? "");
  try {
    // RLS policy return_requests_insert_own verifies ownership + delivered status.
    await asUser(user, async (tx) => {
      const [o] = await tx.query<{ id: string }>("select id from public.orders where order_number = $1 and user_id = $2", [number, user.id]);
      if (!o) throw new Error("not found");
      const open = await tx.query("select 1 from public.return_requests where order_id = $1 and status in ('requested','approved')", [o.id]);
      if (open.length) throw new Error("exists");
      await tx.query("insert into public.return_requests (order_id, user_id, reason) values ($1, $2, $3)", [o.id, user.id, reason]);
    });
  } catch (e) {
    if (e instanceof Error && e.message === "exists") return { error: "يوجد طلب إرجاع قيد المعالجة لهذا الطلب." };
    return { error: "لا يمكن طلب الإرجاع لهذا الطلب (متاح بعد التسليم فقط)." };
  }
  refresh();
  return { ok: true, message: "تم إرسال طلب الإرجاع، سنتواصل معك قريبًا." };
}
