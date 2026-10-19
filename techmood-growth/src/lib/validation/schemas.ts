import { z } from "zod";
import { email, optionalEmail, optionalText, phone, requiredText, uuid } from "./common";

export const passwordRule = z
  .string()
  .min(8, { error: "كلمة المرور 8 أحرف على الأقل" })
  .max(72, { error: "كلمة المرور طويلة جدًا" })
  .refine((p) => /[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p), { error: "استخدم حروفًا وأرقامًا معًا" });

export const registerSchema = z.object({
  fullName: requiredText(2, 120, "الاسم"),
  email,
  password: passwordRule,
  acceptTerms: z.literal("on", { error: "يجب الموافقة على الشروط وسياسة الخصوصية" }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "أدخل كلمة المرور" }).max(200),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ token: z.string().min(20).max(200), password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "كلمتا المرور غير متطابقتين", path: ["confirm"] });

export const changePasswordSchema = z
  .object({ current: z.string().min(1, { error: "أدخل كلمة المرور الحالية" }).max(200), password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "كلمتا المرور غير متطابقتين", path: ["confirm"] });

export const TIMEZONES = [
  ["Asia/Riyadh", "السعودية والكويت والبحرين وقطر (GMT+3)"],
  ["Asia/Dubai", "الإمارات وعُمان (GMT+4)"],
  ["Asia/Gaza", "فلسطين"],
  ["Asia/Amman", "الأردن"],
  ["Africa/Cairo", "مصر"],
  ["Europe/Istanbul", "تركيا"],
  ["UTC", "التوقيت العالمي (UTC)"],
] as const;

export const orgSchema = z.object({
  name: requiredText(2, 120, "اسم الشركة"),
  timezone: z.enum(TIMEZONES.map((t) => t[0]) as [string, ...string[]], { error: "اختر المنطقة الزمنية" }),
  country: optionalText(60),
  industry: optionalText(60),
});

export const orgSettingsSchema = orgSchema.extend({
  retention: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(30, { error: "30 يومًا على الأقل" }).max(3650).nullable(),
  ),
});

export const LEAD_SOURCES = [
  ["manual", "إدخال يدوي"],
  ["phone", "اتصال هاتفي"],
  ["whatsapp", "واتساب"],
  ["walk_in", "زيارة مباشرة"],
  ["referral", "توصية"],
  ["instagram", "إنستغرام"],
  ["facebook", "فيسبوك"],
  ["tiktok", "تيك توك"],
  ["google", "بحث Google"],
  ["event", "فعالية أو معرض"],
  ["other", "أخرى"],
] as const;

export const leadSchema = z
  .object({
    full_name: requiredText(2, 120, "الاسم"),
    email: optionalEmail,
    phone,
    needs: optionalText(4000),
    source: z.string().trim().regex(/^[a-z0-9_-]{1,40}$/, { error: "مصدر غير صالح" }),
    utm_campaign: optionalText(150),
    stage_id: uuid,
    owner_id: z.union([uuid, z.literal("")]).transform((v) => v || null),
    next_follow_up_at: z.string().optional().transform((v) => v || null),
  })
  .refine((v) => v.email || v.phone, { error: "أدخل الهاتف أو البريد للتواصل", path: ["phone"] });

export const ACTIVITY_KINDS = [
  ["note", "ملاحظة"],
  ["call", "مكالمة"],
  ["whatsapp", "واتساب"],
  ["email", "بريد"],
  ["meeting", "لقاء"],
] as const;

export const activitySchema = z.object({
  kind: z.enum(ACTIVITY_KINDS.map((k) => k[0]) as [string, ...string[]]),
  body: requiredText(1, 4000, "النص"),
});

export const FIELD_TYPES = [
  ["text", "نص قصير"],
  ["textarea", "نص طويل"],
  ["email", "بريد إلكتروني"],
  ["phone", "هاتف"],
  ["number", "رقم"],
  ["date", "تاريخ"],
  ["select", "قائمة منسدلة"],
  ["radio", "اختيار واحد"],
  ["checkbox", "مربع موافقة"],
] as const;

export const formSettingsSchema = z.object({
  name: requiredText(2, 120, "اسم النموذج"),
  headline: optionalText(160),
  description: optionalText(2000),
  success_message: requiredText(2, 500, "رسالة النجاح"),
  privacy_notice: requiredText(10, 1500, "إشعار الخصوصية"),
  consent_label: requiredText(5, 300, "نص الموافقة"),
  source_label: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,39}$/, { error: "أحرف إنجليزية صغيرة وأرقام فقط، مثل instagram-ad" }),
});

export const fieldSchema = z.object({
  label: requiredText(1, 160, "عنوان الحقل"),
  type: z.enum(FIELD_TYPES.map((t) => t[0]) as [string, ...string[]]),
  required: z.boolean(),
  is_qualification: z.boolean(),
  placeholder: optionalText(160),
  help_text: optionalText(300),
  options: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30),
    ),
});

export const bookingSettingsSchema = z.object({
  enabled: z.boolean(),
  title: requiredText(2, 120, "عنوان الموعد"),
  description: optionalText(1000),
  location: optionalText(300),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{2,60}$/, { error: "أحرف إنجليزية صغيرة وأرقام وشرطات (3 أحرف على الأقل)" }),
  duration_minutes: z.coerce.number().int().min(10).max(240),
  buffer_minutes: z.coerce.number().int().min(0).max(120),
  slot_step_minutes: z.coerce.number().int().min(5).max(240),
  min_notice_minutes: z.coerce.number().int().min(0).max(20160),
  max_days_ahead: z.coerce.number().int().min(1).max(120),
});

export const appointmentSchema = z.object({
  title: requiredText(2, 160, "العنوان"),
  lead_id: z.union([uuid, z.literal("")]).transform((v) => v || null),
  starts_at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, { error: "اختر التاريخ والوقت" }),
  duration: z.coerce.number().int().min(10).max(480),
  location: optionalText(300),
  notes: optionalText(2000),
  assigned_to: z.union([uuid, z.literal("")]).transform((v) => v || null),
});

export const publicBookingSchema = z.object({
  slug: z.string().max(80),
  starts_at: z.iso.datetime({ offset: true, error: "اختر موعدًا" }),
  name: requiredText(2, 120, "الاسم"),
  email,
  phone,
  notes: optionalText(2000),
  consent: z.literal("on", { error: "يجب الموافقة على استخدام بياناتك لإتمام الحجز" }),
});

export const inviteSchema = z.object({
  email,
  role: z.enum(["admin", "agent", "viewer"], { error: "اختر الدور" }),
});

export const paymentSchema = z.object({
  plan: z.enum(["starter", "growth"], { error: "اختر الخطة" }),
  months: z.coerce.number().int().min(1).max(24),
  method: z.enum(["bank_transfer", "cash", "other"]),
  reference: optionalText(120),
});

export const stageSchema = z.object({
  name: requiredText(1, 40, "اسم المرحلة"),
  category: z.enum(["new", "working", "qualified", "booked", "won", "lost"]),
});
