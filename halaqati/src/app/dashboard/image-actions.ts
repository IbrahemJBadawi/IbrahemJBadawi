"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/common";

const target = z.object({ type: z.enum(["profile", "center", "organization"]), id: z.uuid() });
const DATA_URL = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

export async function setImageAction(type: string, id: string, dataUrl: string): Promise<FormState> {
  await requireUser();
  const t = target.safeParse({ type, id });
  if (!t.success || typeof dataUrl !== "string" || !DATA_URL.test(dataUrl) || dataUrl.length > 300_000) {
    return { ok: false, error: "الصورة غير صالحة أو أكبر من المسموح" };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_entity_image", { p_type: t.data.type, p_id: t.data.id, p_data: dataUrl });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "حُفظت الصورة" };
}

export async function removeImageAction(type: string, id: string): Promise<FormState> {
  await requireUser();
  const t = target.safeParse({ type, id });
  if (!t.success) return { ok: false, error: "طلب غير صالح" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_entity_image", { p_type: t.data.type, p_id: t.data.id });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "حُذفت الصورة" };
}

export async function setPhotoOnCertificatesAction(fd: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("profiles").update({ photo_on_certificates: fd.get("on") === "1" }).eq("id", user.id);
  revalidatePath("/dashboard/profile");
}
