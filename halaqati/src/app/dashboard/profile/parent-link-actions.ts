"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { uuid, type FormState } from "@/lib/validation/common";

export async function createLinkCodeAction(): Promise<FormState & { code?: string }> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_parent_link_code");
  if (error) return { ok: false, error: toUserMessage(error) };
  return { ok: true, code: data as string };
}

const redeemSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{10}$/, { error: "الرمز 10 خانات من حروف وأرقام" }),
  relationship: z.enum(["father", "mother", "guardian", "other"]),
});

export async function redeemLinkCodeAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = redeemSchema.safeParse({ code: fd.get("code"), relationship: fd.get("relationship") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("redeem_parent_link_code", {
    p_code: parsed.data.code,
    p_relationship: parsed.data.relationship,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "تم ربط الابن بحسابك." };
}

export async function revokeLinkAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("revoke_parent_link", { p_link: id.data });
  revalidatePath("/dashboard", "layout");
}
