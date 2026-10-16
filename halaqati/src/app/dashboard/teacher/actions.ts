"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { localToUtcIso } from "@/lib/time";
import { invalid, optionalText, uuid, type FormState } from "@/lib/validation/common";
import {
  amendSchema,
  assignmentSchema,
  errorsFromForm,
  halaqaSchema,
  recitationSchema,
  scheduleFromForm,
  sessionSchema,
} from "@/lib/validation/halaqa";

function halaqaInput(fd: FormData) {
  return {
    name: fd.get("name"),
    description: fd.get("description") ?? undefined,
    centerId: fd.get("centerId") ?? undefined,
    audienceGender: fd.get("audienceGender"),
    ageMin: fd.get("ageMin"),
    ageMax: fd.get("ageMax"),
    level: fd.get("level"),
    maxStudents: fd.get("maxStudents"),
    meetingMode: fd.get("meetingMode"),
    locationText: fd.get("locationText") ?? undefined,
    timezone: fd.get("timezone"),
    status: fd.get("status"),
    joinPolicy: fd.get("joinPolicy"),
    schedule: scheduleFromForm(fd),
  };
}

function halaqaRow(d: z.infer<typeof halaqaSchema>) {
  return {
    name: d.name,
    description: d.description,
    center_id: d.centerId,
    audience_gender: d.audienceGender,
    age_min: d.ageMin ?? null,
    age_max: d.ageMax ?? null,
    level: d.level,
    max_students: d.maxStudents,
    meeting_mode: d.meetingMode,
    location_text: d.locationText,
    timezone: d.timezone,
    status: d.status,
    join_policy: d.joinPolicy,
    schedule: d.schedule,
  };
}

export async function createHalaqaAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = halaqaSchema.safeParse(halaqaInput(fd));
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("halaqat")
    .insert({ ...halaqaRow(parsed.data), teacher_id: user.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath("/dashboard", "layout");
  redirect(`/dashboard/teacher/halaqat/${data.id}?created=1`);
}

export async function updateHalaqaAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = uuid.safeParse(fd.get("id"));
  const parsed = halaqaSchema.safeParse(halaqaInput(fd));
  if (!id.success) return { ok: false, error: "معرّف غير صالح" };
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  // Moving a halaqa between centers is an institution-level operation; the
  // teacher form never changes it.
  const { center_id: _ignored, ...row } = halaqaRow(parsed.data);
  void _ignored;
  const { data, error } = await supabase.from("halaqat").update(row).eq("id", id.data).select("id");
  if (error) return { ok: false, error: toUserMessage(error) };
  if (!data?.length) return { ok: false, error: "لا تملك صلاحية تعديل هذه الحلقة." };
  revalidatePath(`/dashboard/teacher/halaqat/${id.data}`);
  revalidatePath(`/halaqat/${id.data}`);
  redirect(`/dashboard/teacher/halaqat/${id.data}?updated=1`);
}

const decisionSchema = z.object({ membershipId: uuid, halaqaId: uuid, decision: z.enum(["approve", "reject"]), note: optionalText(500) });

export async function decideJoinAction(fd: FormData) {
  await requireUser();
  const parsed = decisionSchema.safeParse({
    membershipId: fd.get("membershipId"),
    halaqaId: fd.get("halaqaId"),
    decision: fd.get("decision"),
    note: fd.get("note") ?? undefined,
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_join_request", {
    p_membership: parsed.data.membershipId,
    p_approve: parsed.data.decision === "approve",
    p_note: parsed.data.note,
  });
  const base = `/dashboard/teacher/halaqat/${parsed.data.halaqaId}`;
  revalidatePath(base);
  if (error) redirect(`${base}?error=${encodeURIComponent(toUserMessage(error))}`);
}

export async function removeMemberAction(fd: FormData) {
  await requireUser();
  const membershipId = uuid.safeParse(fd.get("membershipId"));
  const halaqaId = uuid.safeParse(fd.get("halaqaId"));
  if (!membershipId.success || !halaqaId.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_halaqa_member", { p_membership: membershipId.data, p_note: null });
  const base = `/dashboard/teacher/halaqat/${halaqaId.data}`;
  revalidatePath(base);
  if (error) redirect(`${base}?error=${encodeURIComponent(toUserMessage(error))}`);
}

export async function createSessionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = sessionSchema.safeParse({
    halaqaId: fd.get("halaqaId"),
    startsAt: fd.get("startsAt"),
    durationMinutes: fd.get("durationMinutes"),
    mode: fd.get("mode"),
    meetingUrl: fd.get("meetingUrl") ?? undefined,
    locationText: fd.get("locationText") ?? undefined,
    topic: fd.get("topic") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data: h } = await supabase.from("halaqat").select("timezone").eq("id", parsed.data.halaqaId).single();
  const startsAt = localToUtcIso(parsed.data.startsAt, h?.timezone ?? "UTC");
  if (!startsAt) return { ok: false, fieldErrors: { startsAt: "تاريخ غير صحيح" }, error: "تحقّق من الحقول المظللة." };
  const { data, error } = await supabase
    .from("quran_sessions")
    .insert({
      halaqa_id: parsed.data.halaqaId,
      starts_at: startsAt,
      duration_minutes: parsed.data.durationMinutes,
      mode: parsed.data.mode,
      meeting_url: parsed.data.meetingUrl,
      location_text: parsed.data.locationText,
      topic: parsed.data.topic,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/dashboard/teacher/halaqat/${parsed.data.halaqaId}`);
  redirect(`/dashboard/teacher/sessions/${data.id}`);
}

const sessionStatusSchema = z.object({ sessionId: uuid, status: z.enum(["completed", "cancelled", "scheduled"]), reason: optionalText(300) });

export async function setSessionStatusAction(fd: FormData) {
  await requireUser();
  const parsed = sessionStatusSchema.safeParse({ sessionId: fd.get("sessionId"), status: fd.get("status"), reason: fd.get("reason") ?? undefined });
  if (!parsed.success) return;
  const supabase = await createClient();
  await supabase
    .from("quran_sessions")
    .update({ status: parsed.data.status, cancel_reason: parsed.data.status === "cancelled" ? parsed.data.reason : null })
    .eq("id", parsed.data.sessionId);
  revalidatePath(`/dashboard/teacher/sessions/${parsed.data.sessionId}`);
}

const attendanceStatus = z.enum(["present", "late", "absent", "excused"]);

export async function saveAttendanceAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const sessionId = uuid.safeParse(fd.get("sessionId"));
  if (!sessionId.success) return { ok: false, error: "جلسة غير صالحة" };
  const entries: Array<{ student_id: string; status: string }> = [];
  for (const [key, value] of fd.entries()) {
    if (!key.startsWith("att_")) continue;
    const studentId = uuid.safeParse(key.slice(4));
    const status = attendanceStatus.safeParse(value);
    if (studentId.success && status.success) entries.push({ student_id: studentId.data, status: status.data });
  }
  if (!entries.length) return { ok: false, error: "اختر حالة الحضور لطالب واحد على الأقل." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_attendance", { p_session: sessionId.data, p_entries: entries });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/dashboard/teacher/sessions/${sessionId.data}`);
  return { ok: true, message: `تم حفظ حضور ${entries.length} طالب.` };
}

export async function recordRecitationAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = recitationSchema.safeParse({
    halaqaId: fd.get("halaqaId"),
    studentId: fd.get("studentId"),
    sessionId: fd.get("sessionId") ?? undefined,
    assignmentId: fd.get("assignmentId") ?? undefined,
    activity: fd.get("activity"),
    surahFrom: fd.get("surahFrom"),
    ayahFrom: fd.get("ayahFrom"),
    surahTo: fd.get("surahTo"),
    ayahTo: fd.get("ayahTo"),
    completion: fd.get("completion"),
    masteryScore: fd.get("masteryScore"),
    recitationScore: fd.get("recitationScore"),
    planAdherence: fd.get("planAdherence"),
    teacherNotes: fd.get("teacherNotes") ?? undefined,
    approve: fd.get("intent"),
    errors: errorsFromForm(fd),
  });
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_recitation", {
    p_record: {
      student_id: d.studentId,
      halaqa_id: d.halaqaId,
      session_id: d.sessionId,
      assignment_id: d.assignmentId,
      activity: d.activity,
      surah_from: d.surahFrom,
      ayah_from: d.ayahFrom,
      surah_to: d.surahTo,
      ayah_to: d.ayahTo,
      completion: d.completion,
      mastery_score: d.masteryScore ?? null,
      recitation_score: d.recitationScore ?? null,
      plan_adherence: d.planAdherence,
      teacher_notes: d.teacherNotes,
      approve: d.approve,
    },
    p_errors: d.errors.map((e) => ({ error_type: e.errorType, surah: e.surah ?? null, ayah: e.ayah ?? null, note: e.note })),
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/dashboard/teacher/halaqat/${d.halaqaId}/students/${d.studentId}`);
  if (d.sessionId) revalidatePath(`/dashboard/teacher/sessions/${d.sessionId}`);
  return { ok: true, message: d.approve ? "تم اعتماد التسميع." : "تم حفظ التسميع كمسودة." };
}

export async function approveRecordAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("recordId"));
  const path = String(fd.get("path") ?? "");
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("approve_progress_record", { p_id: id.data });
  if (path.startsWith("/dashboard/")) revalidatePath(path);
}

export async function deleteDraftAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("recordId"));
  const path = String(fd.get("path") ?? "");
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("quran_progress_records").delete().eq("id", id.data).eq("status", "draft");
  if (path.startsWith("/dashboard/")) revalidatePath(path);
}

export async function amendRecordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = amendSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("amend_progress_record", {
    p_id: d.recordId,
    p_patch: {
      surah_from: d.surahFrom,
      ayah_from: d.ayahFrom,
      surah_to: d.surahTo,
      ayah_to: d.ayahTo,
      completion: d.completion,
      mastery_score: d.masteryScore ?? null,
      recitation_score: d.recitationScore ?? null,
      plan_adherence: d.planAdherence,
      teacher_notes: d.teacherNotes,
    },
    p_reason: d.reason,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/dashboard/teacher/halaqat/${d.halaqaId}/students/${d.studentId}`);
  return { ok: true, message: "تم تعديل السجل وتوثيق سبب التعديل." };
}

export async function createAssignmentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = assignmentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return invalid(parsed.error);
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("quran_assignments").insert({
    halaqa_id: d.halaqaId,
    student_id: d.studentId,
    activity: d.activity,
    surah_from: d.surahFrom,
    ayah_from: d.ayahFrom,
    surah_to: d.surahTo,
    ayah_to: d.ayahTo,
    due_on: d.dueOn,
    instructions: d.instructions,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/dashboard/teacher/halaqat/${d.halaqaId}/students/${d.studentId}`);
  return { ok: true, message: "تم تحديد الواجب القادم وإشعار الطالب." };
}

export async function cancelAssignmentAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("assignmentId"));
  const path = String(fd.get("path") ?? "");
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.from("quran_assignments").update({ status: "cancelled" }).eq("id", id.data).eq("status", "assigned");
  if (path.startsWith("/dashboard/")) revalidatePath(path);
}
