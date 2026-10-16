"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireContext } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { APP_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { optionalText, uuid } from "@/lib/validation/common";

const roleSchema = z.object({ userId: uuid, role: z.enum(APP_ROLES), op: z.enum(["grant", "revoke"]), back: z.string() });

export async function adminSetRoleAction(fd: FormData) {
  await requireContext("platform_admin");
  const parsed = roleSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_user_role", {
    p_user: parsed.data.userId,
    p_role: parsed.data.role,
    p_grant: parsed.data.op === "grant",
  });
  const back = parsed.data.back.startsWith("/dashboard/admin/users") ? parsed.data.back : "/dashboard/admin/users";
  revalidatePath("/dashboard/admin/users");
  if (error) redirect(`${back}${back.includes("?") ? "&" : "?"}error=${encodeURIComponent(toUserMessage(error))}`);
}

const statusSchema = z.object({ kind: z.enum(["organization", "center"]), id: uuid, status: z.enum(["pending", "verified", "suspended"]) });

export async function adminSetInstitutionStatusAction(fd: FormData) {
  await requireContext("platform_admin");
  const parsed = statusSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.rpc("admin_set_institution_status", { p_kind: parsed.data.kind, p_id: parsed.data.id, p_status: parsed.data.status });
  revalidatePath("/dashboard/admin/institutions");
}

const privacySchema = z.object({ id: uuid, status: z.enum(["processing", "completed", "rejected"]), notes: optionalText(1000) });

export async function adminUpdatePrivacyAction(fd: FormData) {
  await requireContext("platform_admin");
  const parsed = privacySchema.safeParse({ id: fd.get("id"), status: fd.get("status"), notes: fd.get("notes") ?? undefined });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.rpc("admin_update_privacy_request", { p_id: parsed.data.id, p_status: parsed.data.status, p_notes: parsed.data.notes });
  revalidatePath("/dashboard/admin/privacy");
}

const reviewSchema = z.object({ id: uuid, decision: z.enum(["approve", "reject"]), note: optionalText(1000) });

export async function adminReviewVerificationAction(fd: FormData) {
  await requireContext("platform_admin");
  const parsed = reviewSchema.safeParse({ id: fd.get("id"), decision: fd.get("decision"), note: fd.get("note") ?? undefined });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.rpc("admin_review_verification", { p_id: parsed.data.id, p_approve: parsed.data.decision === "approve", p_note: parsed.data.note });
  revalidatePath("/dashboard/admin/verifications");
}

const ticketUpdateSchema = z.object({ id: uuid, status: z.enum(["open", "in_progress", "resolved", "closed"]), reply: optionalText(3000) });

export async function adminUpdateTicketAction(fd: FormData) {
  await requireContext("platform_admin");
  const parsed = ticketUpdateSchema.safeParse({ id: fd.get("id"), status: fd.get("status"), reply: fd.get("reply") ?? undefined });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase.rpc("admin_update_ticket", { p_id: parsed.data.id, p_status: parsed.data.status, p_reply: parsed.data.reply });
  revalidatePath("/dashboard/admin/tickets");
}
