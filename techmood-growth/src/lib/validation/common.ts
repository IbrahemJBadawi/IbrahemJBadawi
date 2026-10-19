import { z } from "zod";

export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Echo of non-secret inputs so a failed submit does not wipe the form. */
  values?: Record<string, string>;
  /** Extra data for the client (e.g. an AI draft or a share link). */
  data?: Record<string, string>;
};

export const uuid = z.uuid({ error: "معرّف غير صالح" });

export const email = z.string().trim().toLowerCase().max(254).pipe(z.email({ error: "أدخل بريدًا إلكترونيًا صحيحًا" }));

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `الحد الأقصى ${max} حرفًا` })
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const requiredText = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} مطلوب` })
    .trim()
    .min(min, { error: min <= 1 ? `${label} مطلوب` : `${label}: ${min} أحرف على الأقل` })
    .max(max, { error: `الحد الأقصى ${max} حرفًا` });

export const phone = z
  .string()
  .trim()
  .max(32)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || (/^\+?[0-9 ()-]{7,20}$/.test(v) && v.replace(/\D/g, "").length >= 7 && v.replace(/\D/g, "").length <= 15), {
    error: "رقم الهاتف غير صحيح",
  });

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.email().safeParse(v).success, { error: "أدخل بريدًا إلكترونيًا صحيحًا" });

/** `datetime-local` input → ISO instant in the given IANA time zone. */
export function localToInstant(value: string, timeZone: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  // Offset of the zone at that moment, applied twice to settle DST edges.
  const offset = (t: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(t));
    const get = (t2: string) => Number(parts.find((p) => p.type === t2)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - t;
  };
  let t = guess - offset(guess);
  t = guess - offset(t);
  return new Date(t);
}

export function flattenErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function invalid(error: z.ZodError, values?: Record<string, string>): FormState {
  return { ok: false, error: "تحقّق من الحقول المظللة.", fieldErrors: flattenErrors(error), values };
}

/** Plain object of string values from FormData (for echoing back). */
export function formValues(fd: FormData, ...names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, String(fd.get(n) ?? "")]));
}

/** Only internal relative redirects (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
