"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireContext, requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { invalid, optionalText, uuid, type FormState } from "@/lib/validation/common";

const ticketSchema = z.object({
  category: z.enum(["report_abuse", "technical", "privacy", "suggestion", "other"]),
  subject: z.string().trim().min(3, { error: "اكتب عنوانًا مختصرًا" }).max(150),
  body: z.string().trim().min(10, { error: "اشرح المشكلة بعشرة أحرف على الأقل" }).max(3000),
  relatedPath: optionalText(300).refine((v) => v === null || (v.startsWith("/") && !v.startsWith("//")), { error: "رابط غير صالح" }),
});

export async function createTicketAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = ticketSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_support_ticket", {
    p_category: parsed.data.category,
    p_subject: parsed.data.subject,
    p_body: parsed.data.body,
    p_related_path: parsed.data.relatedPath,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard/support");
  return { ok: true, message: "تم استلام بلاغك وستصلك إشعارات بالرد." };
}

const verifySchema = z.object({
  qualifications: z.string().trim().min(20, { error: "اذكر مؤهلاتك بتفصيل (20 حرفًا على الأقل)" }).max(2000),
  evidenceUrl: optionalText(500).refine((v) => v === null || /^https:\/\/\S+$/.test(v), { error: "الرابط يجب أن يبدأ بـ https://" }),
});

export async function submitVerificationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = verifySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_teacher_verification", {
    p_qualifications: parsed.data.qualifications,
    p_evidence_url: parsed.data.evidenceUrl,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard/profile");
  return { ok: true, message: "تم إرسال طلب التوثيق، وستراجعه إدارة المنصة." };
}

export async function dismissOnboardingAction() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("profiles").update({ onboarding_dismissed_at: new Date().toISOString() }).eq("id", user.id);
  revalidatePath("/dashboard");
}

export async function setCertificateVisibilityAction(fd: FormData) {
  await requireContext("student");
  const id = uuid.safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("set_certificate_name_visibility", { p_id: id.data, p_show: fd.get("show") === "1" });
  revalidatePath("/dashboard/certificates");
}

const certSchema = z.object({
  halaqaId: uuid,
  studentId: uuid,
  kind: z.enum(["juz_completion", "surah_completion", "khatm", "attendance", "other"]),
  title: z.string().trim().min(3, { error: "عنوان الشهادة 3 أحرف على الأقل" }).max(150),
  titleEn: optionalText(150),
  description: optionalText(500),
});

export async function issueCertificateAction(_prev: FormState & { serial?: string }, fd: FormData): Promise<FormState & { serial?: string }> {
  await requireContext("quran_teacher");
  const parsed = certSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("issue_certificate", {
    p_student: d.studentId,
    p_halaqa: d.halaqaId,
    p_kind: d.kind,
    p_title: d.title,
    p_title_en: d.titleEn,
    p_description: d.description,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/dashboard/teacher/halaqat/${d.halaqaId}/students/${d.studentId}`);
  return { ok: true, message: "تم إصدار الشهادة وإشعار الطالب.", serial: data as string };
}

export async function revokeCertificateAction(fd: FormData) {
  await requireContext("quran_teacher");
  const id = uuid.safeParse(fd.get("id"));
  const reason = String(fd.get("reason") ?? "");
  const path = String(fd.get("path") ?? "");
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("revoke_certificate", { p_id: id.data, p_reason: reason });
  if (path.startsWith("/dashboard/")) revalidatePath(path);
}
