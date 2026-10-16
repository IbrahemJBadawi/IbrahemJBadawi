"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACTIVE_CONTEXT_COOKIE, requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { SELF_SERVICE_ROLES, isContextKey } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { invalid, optionalText, uuid, type FormState } from "@/lib/validation/common";
import { profileSchema } from "@/lib/validation/profile";

/** Switch the UI context — only to a context the user really has. */
export async function switchContextAction(fd: FormData) {
  const user = await requireUser();
  const requested = fd.get("context");
  if (isContextKey(requested) && user.contexts.includes(requested)) {
    (await cookies()).set(ACTIVE_CONTEXT_COOKIE, requested, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  redirect("/dashboard");
}

export async function markNotificationReadAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  const supabase = await createClient();
  if (id.success) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id.data);
  } else if (fd.get("all") === "1") {
    await supabase.rpc("mark_all_notifications_read");
  }
  revalidatePath("/dashboard", "layout");
}

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const [p, det] = await Promise.all([
    supabase
      .from("profiles")
      .update({ full_name: d.fullName, display_name: d.displayName, bio: d.bio, directory_visible: d.directoryVisible })
      .eq("id", user.id),
    supabase
      .from("profile_details")
      .update({ gender: d.gender, birth_year: d.birthYear ?? null, country: d.country, city: d.city })
      .eq("user_id", user.id),
  ]);
  if (p.error || det.error) return { ok: false, error: toUserMessage(p.error ?? det.error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: "تم حفظ بياناتك." };
}

const roleSchema = z.object({ role: z.enum(SELF_SERVICE_ROLES as [string, ...string[]]), op: z.enum(["add", "remove"]) });

export async function changeMyRoleAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = roleSchema.safeParse({ role: fd.get("role"), op: fd.get("op") });
  if (!parsed.success) return { ok: false, error: "دور غير صالح." };
  const supabase = await createClient();
  const { error } = await supabase.rpc(parsed.data.op === "add" ? "add_my_role" : "remove_my_role", { p_role: parsed.data.role });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard", "layout");
  return { ok: true, message: parsed.data.op === "add" ? "تمت إضافة الدور." : "تمت إزالة الدور." };
}

const privacySchema = z.object({ kind: z.enum(["export", "delete"]), reason: optionalText(1000) });

export async function createPrivacyRequestAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = privacySchema.safeParse({ kind: fd.get("kind"), reason: fd.get("reason") ?? undefined });
  if (!parsed.success) return { ok: false, error: "طلب غير صالح." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_privacy_request", { p_kind: parsed.data.kind, p_reason: parsed.data.reason });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard/profile");
  return { ok: true, message: "تم استلام طلبك، وستتابعه إدارة المنصة." };
}

export async function cancelPrivacyRequestAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("cancel_privacy_request", { p_id: id.data });
  revalidatePath("/dashboard/profile");
}
