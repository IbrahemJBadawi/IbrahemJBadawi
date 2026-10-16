"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { invalid, optionalText, requiredInt, uuid, type FormState } from "@/lib/validation/common";

/* ---------------- personal tasks ---------------- */

const taskSchema = z.object({
  title: z.string().trim().min(2, { error: "اكتب عنوانًا من حرفين على الأقل" }).max(150, { error: "الحد الأقصى 150 حرفًا" }),
  due_on: z.union([z.literal(""), z.iso.date({ error: "تاريخ غير صالح" })]).optional().transform((v) => v || null),
  priority: z.enum(["1", "2", "3"]).default("2").transform(Number),
});

export async function addTaskAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = taskSchema.safeParse({ title: fd.get("title"), due_on: fd.get("due_on") ?? "", priority: fd.get("priority") ?? "2" });
  if (!parsed.success) return { ...invalid(parsed.error), values: { title: String(fd.get("title") ?? "") } };
  const supabase = await createClient();
  const { error } = await supabase.from("personal_tasks").insert({ user_id: user.id, ...parsed.data });
  if (error) return { ok: false, error: toUserMessage(error), values: { title: parsed.data.title } };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "أُضيفت المهمة" };
}

export async function toggleTaskAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  const done = fd.get("done") === "1";
  await supabase.from("personal_tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id.data);
  revalidatePath("/dashboard", "layout");
}

export async function deleteTaskAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("personal_tasks").delete().eq("id", id.data);
  revalidatePath("/dashboard", "layout");
}

/* ---------------- daily wird ---------------- */

const wirdSchema = z.object({ pages: requiredInt(1, 604, "عدد الصفحات"), note: optionalText(300) });

export async function logWirdAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = wirdSchema.safeParse({ pages: fd.get("pages"), note: fd.get("note") ?? "" });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("log_daily_wird", { p_pages: parsed.data.pages, p_note: parsed.data.note });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "سُجّل وردك اليوم، بارك الله فيك" };
}

/* ---------------- reactions ---------------- */

const reactionSchema = z.object({
  entity_type: z.enum(["progress_record", "certificate"]),
  entity_id: uuid,
  kind: z.enum(["mashallah", "barakallah", "clap", "star", "heart"]),
});

export async function toggleReactionAction(fd: FormData) {
  const user = await requireUser();
  const parsed = reactionSchema.safeParse({ entity_type: fd.get("entity_type"), entity_id: fd.get("entity_id"), kind: fd.get("kind") });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("reactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("entity_type", parsed.data.entity_type)
    .eq("entity_id", parsed.data.entity_id)
    .eq("kind", parsed.data.kind)
    .maybeSingle();
  if (existing) await supabase.from("reactions").delete().eq("id", existing.id);
  else await supabase.from("reactions").insert({ user_id: user.id, ...parsed.data });
  revalidatePath("/dashboard", "layout");
}

/* ---------------- league & settings ---------------- */

export async function setLeagueVisibilityAction(fd: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("profiles").update({ league_visible: fd.get("visible") === "1" }).eq("id", user.id);
  revalidatePath("/dashboard", "layout");
}

export async function setHalaqaLeagueAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("halaqaId"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("halaqat").update({ league_enabled: fd.get("enabled") === "1" }).eq("id", id.data);
  revalidatePath("/dashboard", "layout");
}

/* ---------------- web push ---------------- */

const pushSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(8).max(100),
});

export async function savePushSubscriptionAction(input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }): Promise<FormState> {
  await requireUser();
  const parsed = pushSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "اشتراك الإشعارات غير صالح" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: parsed.data.endpoint,
    p_p256dh: parsed.data.p256dh,
    p_auth: parsed.data.auth,
    p_user_agent: (input.userAgent ?? "").slice(0, 300) || null,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "فُعّلت الإشعارات على هذا الجهاز" };
}

export async function removePushSubscriptionAction(endpoint: string): Promise<FormState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", String(endpoint).slice(0, 1000));
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard/settings");
  return { ok: true, message: "أُوقفت الإشعارات على هذا الجهاز" };
}

export async function getVapidKeyAction(): Promise<string | null> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_vapid_public_key");
  return typeof data === "string" && data ? data : null;
}
