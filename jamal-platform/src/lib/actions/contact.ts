"use server";

import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { asSystem } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import type { FormState } from "./account";

const schema = z
  .object({
    name: z.string().trim().min(2, "الاسم مطلوب").max(80),
    email: z.union([z.literal(""), z.email("البريد غير صالح").max(200)]),
    phone: z.union([z.literal(""), z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "رقم الهاتف غير صالح")]),
    subject: z.string().trim().max(120),
    message: z.string().trim().min(10, "الرسالة قصيرة جدًا").max(3000),
  })
  .refine((d) => d.email || d.phone, { message: "أدخل البريد الإلكتروني أو رقم الهاتف للتواصل معك", path: ["email"] });

export async function contactAction(_: FormState, form: FormData): Promise<FormState> {
  // Honeypot field: bots fill it, humans never see it.
  if (form.get("website")) return { ok: true, message: "تم إرسال رسالتك." };
  if (!(await rateLimit("contact", 5, 60 * 60_000))) return { error: "أرسلت رسائل كثيرة. حاول لاحقًا." };
  const parsed = schema.safeParse({
    name: form.get("name") ?? "",
    email: form.get("email") ?? "",
    phone: form.get("phone") ?? "",
    subject: form.get("subject") ?? "",
    message: form.get("message") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const user = await getCurrentUser();
  const d = parsed.data;
  await asSystem((tx) =>
    tx.query(
      "insert into public.contact_messages (name, email, phone, subject, message, user_id) values ($1,$2,$3,$4,$5,$6)",
      [d.name, d.email || null, d.phone || null, d.subject || null, d.message, user?.id ?? null],
    ),
  );
  return { ok: true, message: "تم إرسال رسالتك، سنرد عليك في أقرب وقت." };
}
