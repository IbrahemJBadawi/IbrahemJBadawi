/** Turns database errors into safe Arabic messages (never raw internals). */
type MaybeError = { code?: string; message?: string } | null | undefined;

const ARABIC = /[؀-ۿ]/;
export const GENERIC_ERROR = "حدث خطأ غير متوقع. حاول مرة أخرى.";

export function toUserMessage(error: unknown, fallback = GENERIC_ERROR): string {
  const e = (error ?? {}) as MaybeError & { cause?: MaybeError };
  const msg = e?.message ?? "";
  // Messages raised by our own SQL are already user-facing Arabic.
  if (ARABIC.test(msg)) return msg.split("\n")[0];
  switch (e?.code) {
    case "42501":
      return "لا تملك صلاحية تنفيذ هذا الإجراء.";
    case "23505":
      return "هذا السجل موجود مسبقًا.";
    case "23503":
      return "لا يمكن إتمام العملية لارتباطها بسجلات أخرى.";
    case "23514":
    case "22023":
    case "22P02":
    case "22007":
    case "22008":
      return "بعض البيانات المدخلة غير صحيحة.";
    case "23P01":
      return "يتعارض هذا الموعد مع موعد آخر محجوز.";
  }
  if (/row-level security|permission denied/i.test(msg)) return "لا تملك صلاحية تنفيذ هذا الإجراء.";
  return fallback;
}

/** Logs the technical error server-side without personal data in the message. */
export function logError(scope: string, error: unknown) {
  const e = error as MaybeError;
  console.error(`[${scope}]`, e?.code ?? "", (e?.message ?? String(error)).slice(0, 300));
}
