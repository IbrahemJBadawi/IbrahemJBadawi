import { z } from "zod";

/** Small helpers to read typed values from FormData in admin actions. */
export const f = {
  str: (form: FormData, k: string) => String(form.get(k) ?? "").trim(),
  opt: (form: FormData, k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v === "" ? null : v;
  },
  bool: (form: FormData, k: string) => form.get(k) === "on" || form.get(k) === "true",
  list: (form: FormData, k: string) =>
    String(form.get(k) ?? "")
      .split(/[,\s،]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
};

export const money = z
  .string()
  .trim()
  .regex(/^\d{1,9}(\.\d{1,3})?$/, "قيمة مالية غير صالحة (مثال: 25 أو 25.50)");
export const optMoney = z.union([z.literal(""), money]).transform((v) => (v === "" ? null : v));
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "المعرّف (slug) يقبل أحرفًا إنجليزية صغيرة وأرقامًا وشرطات فقط");
export const currency = z.string().regex(/^[A-Z]{3}$/, "عملة غير صالحة");
export const country = z.string().regex(/^[A-Z]{2}$/, "رمز دولة غير صالح");
export const optUrl = z
  .union([z.literal(""), z.url("رابط غير صالح").max(1000)])
  .transform((v) => (v === "" ? null : v));

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}

/** Map common Postgres errors to friendly Arabic messages. */
export function dbError(e: unknown): string {
  const err = e as { code?: string; constraint?: string; message?: string };
  if (err?.code === "23505") return "القيمة مستخدمة مسبقًا (مكرر). جرّب قيمة أخرى.";
  if (err?.code === "23503") return "لا يمكن تنفيذ العملية لوجود بيانات مرتبطة.";
  if (err?.code === "23514") return "إحدى القيم غير مقبولة (تحقق من الأسعار والقيود).";
  if (err?.code === "42501") return "ليست لديك صلاحية لتنفيذ هذه العملية.";
  console.error(e);
  return "تعذّر حفظ التغييرات.";
}
