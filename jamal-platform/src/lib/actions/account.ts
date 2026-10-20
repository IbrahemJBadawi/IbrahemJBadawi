"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";

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
