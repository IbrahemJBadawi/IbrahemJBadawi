import { z } from "zod";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Echo of non-secret inputs so a failed submit does not wipe the form. */
  values?: Record<string, string>;
};

export const uuid = z.uuid({ error: "معرّف غير صالح" });

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `الحد الأقصى ${max} حرفًا` })
    .optional()
    .transform((v) => (v ? v : null));

/** Empty string → undefined, otherwise integer. */
export const optionalInt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ error: "أدخل رقمًا" }).int().min(min, { error: `أقل قيمة ${min}` }).max(max, { error: `أكبر قيمة ${max}` }).optional(),
  );

export const requiredInt = (min: number, max: number, label = "القيمة") =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number({ error: `${label} مطلوبة` }).int().min(min, { error: `أقل قيمة ${min}` }).max(max, { error: `أكبر قيمة ${max}` }),
  );

export function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError): FormState {
  return { ok: false, error: "تحقّق من الحقول المظللة.", fieldErrors: flattenErrors(error) };
}
