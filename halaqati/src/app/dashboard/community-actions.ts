"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireContext, requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { uuid, type FormState } from "@/lib/validation/common";

/* ---------------- halaqa messages ---------------- */

const messageSchema = z.object({
  halaqaId: uuid,
  body: z.string().trim().min(1, { error: "اكتب رسالتك" }).max(1000, { error: "الحد الأقصى 1000 حرف" }),
});

export async function postMessageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = messageSchema.safeParse({ halaqaId: fd.get("halaqaId"), body: fd.get("body") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "تحقّق من الرسالة", values: { body: String(fd.get("body") ?? "") } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_halaqa_message", {
    p_halaqa: parsed.data.halaqaId,
    p_body: parsed.data.body,
    p_announcement: fd.get("announcement") === "on",
  });
  if (error) return { ok: false, error: toUserMessage(error), values: { body: parsed.data.body } };
  revalidatePath("/dashboard/messages");
  return { ok: true };
}

export async function deleteMessageAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("delete_halaqa_message", { p_id: id.data });
  revalidatePath("/dashboard/messages");
}

export async function pinMessageAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("pin_halaqa_message", { p_id: id.data, p_pinned: fd.get("pinned") === "1" });
  revalidatePath("/dashboard/messages");
}

export async function setChatModeAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("halaqaId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("halaqat").update({ chat_students_can_post: fd.get("open") === "1" }).eq("id", id.data);
  revalidatePath("/dashboard", "layout");
}

/* ---------------- demo data (platform admin) ---------------- */

export async function seedDemoAction() {
  await requireContext("platform_admin");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_seed_demo");
  revalidatePath("/dashboard", "layout");
  redirect(error ? `/dashboard/admin/demo?error=${encodeURIComponent(toUserMessage(error))}` : "/dashboard/admin/demo?seeded=1");
}

export async function purgeDemoAction(fd: FormData) {
  await requireContext("platform_admin");
  if (fd.get("confirm") !== "on") redirect("/dashboard/admin/demo?error=" + encodeURIComponent("أكّد الحذف أولًا"));
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_purge_demo");
  revalidatePath("/dashboard", "layout");
  redirect(error ? `/dashboard/admin/demo?error=${encodeURIComponent(toUserMessage(error))}` : "/dashboard/admin/demo?purged=1");
}

/* ---------------- staff channels (center / organization) ---------------- */

const staffSchema = z.object({
  scope: z.enum(["center", "organization"]),
  scopeId: uuid,
  body: z.string().trim().min(1, { error: "اكتب رسالتك" }).max(2000, { error: "الحد الأقصى 2000 حرف" }),
});

export async function postStaffMessageAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = staffSchema.safeParse({ scope: fd.get("scope"), scopeId: fd.get("scopeId"), body: fd.get("body") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "تحقّق من الرسالة", values: { body: String(fd.get("body") ?? "") } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_staff_message", {
    p_scope: parsed.data.scope, p_id: parsed.data.scopeId, p_body: parsed.data.body, p_announcement: fd.get("announcement") === "on",
  });
  if (error) return { ok: false, error: toUserMessage(error), values: { body: parsed.data.body } };
  revalidatePath("/dashboard/staff-messages");
  return { ok: true };
}

export async function deleteStaffMessageAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("delete_staff_message", { p_id: id.data });
  revalidatePath("/dashboard/staff-messages");
}

export async function pinStaffMessageAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("pin_staff_message", { p_id: id.data, p_pinned: fd.get("pinned") === "1" });
  revalidatePath("/dashboard/staff-messages");
}
