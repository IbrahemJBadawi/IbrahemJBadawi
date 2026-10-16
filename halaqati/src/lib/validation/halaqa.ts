import { z } from "zod";
import { measureRange } from "@/lib/quran/surahs";
import { isValidTimeZone } from "@/lib/time";
import { optionalInt, optionalText, requiredInt, uuid } from "./common";

export const scheduleSlot = z.object({
  day: z.number().int().min(0).max(6),
  start: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, { error: "وقت غير صحيح" }),
  duration: z.number().int().min(10).max(600),
});

/** Reads repeated schedule fields (slot_day / slot_start / slot_duration). */
export function scheduleFromForm(fd: FormData) {
  const days = fd.getAll("slot_day").map(String);
  const starts = fd.getAll("slot_start").map(String);
  const durations = fd.getAll("slot_duration").map(String);
  const out: Array<{ day: number; start: string; duration: number }> = [];
  days.forEach((d, i) => {
    if (d === "" || !starts[i]) return;
    out.push({ day: Number(d), start: starts[i], duration: Number(durations[i] || 60) });
  });
  return out;
}

export const halaqaSchema = z
  .object({
    name: z.string().trim().min(3, { error: "اسم الحلقة 3 أحرف على الأقل" }).max(120),
    description: optionalText(2000),
    centerId: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(uuid.nullable()),
    audienceGender: z.enum(["male", "female", "mixed"]),
    ageMin: optionalInt(3, 120),
    ageMax: optionalInt(3, 120),
    level: z.enum(["beginner", "intermediate", "advanced", "all"]),
    maxStudents: requiredInt(1, 300, "الحد الأقصى للطلاب"),
    meetingMode: z.enum(["in_person", "remote", "hybrid"]),
    locationText: optionalText(200),
    timezone: z.string().refine(isValidTimeZone, { error: "منطقة زمنية غير صحيحة" }),
    status: z.enum(["draft", "published", "paused", "completed"]),
    joinPolicy: z.enum(["open", "approval"]),
    schedule: z.array(scheduleSlot).max(14, { error: "14 موعدًا كحد أقصى" }),
  })
  .refine((v) => v.ageMin === undefined || v.ageMax === undefined || v.ageMin <= v.ageMax, {
    error: "العمر الأدنى يجب ألا يتجاوز الأعلى",
    path: ["ageMax"],
  });

export const sessionSchema = z.object({
  halaqaId: uuid,
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: "حدّد تاريخ ووقت الجلسة" }),
  durationMinutes: requiredInt(5, 600, "المدة"),
  mode: z.enum(["in_person", "remote", "hybrid"]),
  meetingUrl: optionalText(500).refine((v) => v === null || /^https:\/\/[^\s]+$/.test(v), {
    error: "رابط الاجتماع يجب أن يبدأ بـ https://",
  }),
  locationText: optionalText(200),
  topic: optionalText(200),
});

const rangeFields = {
  surahFrom: requiredInt(1, 114, "السورة"),
  ayahFrom: requiredInt(1, 286, "الآية"),
  surahTo: requiredInt(1, 114, "السورة"),
  ayahTo: requiredInt(1, 286, "الآية"),
};

function checkRange(
  v: { surahFrom: number; ayahFrom: number; surahTo: number; ayahTo: number },
  ctx: z.RefinementCtx,
) {
  const r = measureRange(v);
  if (!r.ok) ctx.addIssue({ code: "custom", message: r.error, path: ["ayahTo"] });
}

export const errorEntrySchema = z.object({
  errorType: z.enum(["memorization", "tajweed", "pronunciation", "waqf_ibtida", "hesitation", "other"]),
  surah: optionalInt(1, 114),
  ayah: optionalInt(1, 286),
  note: optionalText(500),
});

export function errorsFromForm(fd: FormData) {
  const types = fd.getAll("err_type").map(String);
  const surahs = fd.getAll("err_surah").map(String);
  const ayahs = fd.getAll("err_ayah").map(String);
  const notes = fd.getAll("err_note").map(String);
  return types
    .map((t, i) => ({ errorType: t, surah: surahs[i] ?? "", ayah: ayahs[i] ?? "", note: notes[i] ?? "" }))
    .filter((e) => e.errorType);
}

export const recitationSchema = z
  .object({
    halaqaId: uuid,
    studentId: uuid,
    sessionId: z.string().optional().transform((v) => (v ? v : null)).pipe(uuid.nullable()),
    assignmentId: z.string().optional().transform((v) => (v ? v : null)).pipe(uuid.nullable()),
    activity: z.enum(["new_memorization", "near_review", "far_review"]),
    ...rangeFields,
    completion: z.enum(["completed", "partial", "not_completed"]),
    masteryScore: optionalInt(1, 5),
    recitationScore: optionalInt(1, 5),
    planAdherence: z.enum(["met", "partial", "missed", "no_plan"]),
    teacherNotes: optionalText(2000),
    approve: z.preprocess((v) => v === "approve", z.boolean()),
    errors: z.array(errorEntrySchema).max(100),
  })
  .superRefine((v, ctx) => {
    checkRange(v, ctx);
    if (v.completion !== "not_completed" && v.masteryScore === undefined) {
      ctx.addIssue({ code: "custom", message: "حدّد تقييم إتقان الحفظ", path: ["masteryScore"] });
    }
  });

export const assignmentSchema = z
  .object({
    halaqaId: uuid,
    studentId: uuid,
    activity: z.enum(["new_memorization", "near_review", "far_review"]),
    ...rangeFields,
    dueOn: z
      .string()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), { error: "تاريخ غير صحيح" }),
    instructions: optionalText(1000),
  })
  .superRefine(checkRange);

export const amendSchema = z
  .object({
    recordId: uuid,
    halaqaId: uuid,
    studentId: uuid,
    ...rangeFields,
    completion: z.enum(["completed", "partial", "not_completed"]),
    masteryScore: optionalInt(1, 5),
    recitationScore: optionalInt(1, 5),
    planAdherence: z.enum(["met", "partial", "missed", "no_plan"]),
    teacherNotes: optionalText(2000),
    reason: z.string().trim().min(5, { error: "اكتب سببًا واضحًا للتعديل (5 أحرف على الأقل)" }).max(500),
  })
  .superRefine(checkRange);
