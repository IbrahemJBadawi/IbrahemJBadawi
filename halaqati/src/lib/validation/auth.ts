import { z } from "zod";
import { SELF_SERVICE_ROLES } from "@/lib/roles";

const email = z.string().trim().toLowerCase().pipe(z.email({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }));

export const passwordRule = z
  .string()
  .min(8, { error: "كلمة المرور 8 أحرف على الأقل" })
  .max(72, { error: "كلمة المرور طويلة جدًا" })
  .refine((p) => /[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p), { error: "استخدم حروفًا وأرقامًا معًا" });

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, { error: "اكتب اسمك (حرفان على الأقل)" }).max(120),
  email,
  password: passwordRule,
  roles: z
    .array(z.enum(SELF_SERVICE_ROLES as [string, ...string[]]))
    .min(1, { error: "اختر دورًا واحدًا على الأقل" }),
  acceptTerms: z.literal("on", { error: "يجب الموافقة على الشروط وسياسة الخصوصية" }),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "أدخل كلمة المرور" }).max(200),
  next: z.string().optional(),
});

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password: passwordRule, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { error: "كلمتا المرور غير متطابقتين", path: ["confirm"] });

/** Only allow internal relative redirects (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
