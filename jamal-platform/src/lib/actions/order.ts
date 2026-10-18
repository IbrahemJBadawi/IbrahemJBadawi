"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { asSystem } from "@/lib/db";
import { resolveOrderAccess } from "@/lib/data/orders";
import { rateLimit } from "@/lib/rate-limit";
import { readProofFile } from "@/lib/storage";
import { customerCancel, submitPaymentProof, WorkflowError } from "@/lib/orders/workflow";
import { money } from "@/lib/admin/form";
import type { FormState } from "./account";

/** Every customer action re-checks access to the order on the server. */
async function access(form: FormData) {
  return resolveOrderAccess({
    number: String(form.get("orderNumber") ?? ""),
    token: String(form.get("t") ?? "") || null,
    phone: String(form.get("p") ?? "") || null,
  });
}

function handle(e: unknown): FormState {
  if (e instanceof WorkflowError) return { error: e.message };
  console.error(e);
  return { error: "تعذّر حفظ العملية بسبب خطأ مؤقت. لم يتغير شيء، حاول مرة أخرى." };
}

export async function uploadProofAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("proof", 10, 60 * 60_000))) return { error: "محاولات كثيرة. حاول لاحقًا." };
  const orderId = await access(form);
  if (!orderId) return { error: "لا يمكن الوصول إلى هذا الطلب." };
  const amount = money.safeParse(String(form.get("declaredAmount") ?? "").trim());
  if (!amount.success || Number(amount.data) <= 0) return { fieldErrors: { declaredAmount: ["أدخل المبلغ الذي حوّلته"] } };
  const reference = String(form.get("reference") ?? "").trim().slice(0, 120) || null;
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  const raw = form.get("file");
  let file: { mime: string; data: Uint8Array } | null = null;
  if (raw instanceof File && raw.size > 0) {
    const r = await readProofFile(raw);
    if (!r.ok) return { error: r.error };
    file = { mime: r.mime, data: r.data };
  }
  if (!file && !reference) return { error: "ارفع صورة الإثبات أو اكتب رقم مرجع التحويل على الأقل." };
  try {
    await asSystem((tx) => submitPaymentProof(tx, orderId, { declaredAmount: amount.data, reference, note, file }));
  } catch (e) {
    return handle(e);
  }
  refresh();
  return { ok: true, message: "تم استلام الإثبات وهو قيد المراجعة. سنؤكد الدفع بعد التحقق من وصول المبلغ إلى الحساب." };
}

export async function customerCancelAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("cancel", 10, 60 * 60_000))) return { error: "محاولات كثيرة. حاول لاحقًا." };
  const orderId = await access(form);
  if (!orderId) return { error: "لا يمكن الوصول إلى هذا الطلب." };
  const reason = String(form.get("reason") ?? "").trim().slice(0, 500);
  let result: "cancelled" | "requested";
  try {
    result = await asSystem((tx) => customerCancel(tx, orderId, reason));
  } catch (e) {
    return handle(e);
  }
  refresh();
  return { ok: true, message: result === "cancelled" ? "تم إلغاء الطلب." : "تم إرسال طلب الإلغاء وهو قيد المراجعة." };
}

const returnSchema = z.object({
  kind: z.enum(["return", "exchange", "damaged", "wrong_item"]),
  reason: z.string().trim().min(5, "يرجى توضيح السبب (5 أحرف على الأقل)").max(2000),
});

export async function requestReturnAction(_: FormState, form: FormData): Promise<FormState> {
  if (!(await rateLimit("return", 5, 60 * 60_000))) return { error: "محاولات كثيرة. حاول لاحقًا." };
  const orderId = await access(form);
  if (!orderId) return { error: "لا يمكن الوصول إلى هذا الطلب." };
  const parsed = returnSchema.safeParse({ kind: form.get("kind"), reason: form.get("reason") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await asSystem(async (tx) => {
      const [o] = await tx.query<{ status: string; user_id: string | null }>("select status, user_id from public.orders where id = $1 for update", [orderId]);
      if (!o || o.status !== "delivered") throw new WorkflowError("طلب الإرجاع أو الاستبدال متاح بعد تسليم الطلب فقط.");
      const open = await tx.query("select 1 from public.return_requests where order_id = $1 and status in ('requested','approved','received')", [orderId]);
      if (open.length) throw new WorkflowError("يوجد طلب إرجاع قيد المعالجة لهذا الطلب.");
      await tx.query(
        "insert into public.return_requests (order_id, user_id, kind, reason) values ($1, $2, $3, $4)",
        [orderId, o.user_id, parsed.data.kind, parsed.data.reason],
      );
      await tx.query(
        "insert into public.order_events (order_id, note, visible_to_customer) values ($1, 'تم استلام طلب الإرجاع/الاستبدال وهو قيد المراجعة.', true)",
        [orderId],
      );
    });
  } catch (e) {
    return handle(e);
  }
  refresh();
  return { ok: true, message: "تم إرسال طلبك، سنتواصل معك قريبًا." };
}
