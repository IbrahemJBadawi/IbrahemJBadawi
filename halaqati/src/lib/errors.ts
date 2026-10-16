/** Turns database/auth errors into safe Arabic messages (never raw internals). */
type MaybeError = { code?: string; message?: string; status?: number } | null | undefined;

const ARABIC = /[؀-ۿ]/;

export const GENERIC_ERROR = "حدث خطأ غير متوقع. حاول مرة أخرى.";

export function toUserMessage(error: MaybeError, fallback = GENERIC_ERROR): string {
  if (!error) return fallback;
  const msg = error.message ?? "";
  // Messages raised by our own SQL functions are already user-facing Arabic.
  if (ARABIC.test(msg)) return msg.split("\n")[0];
  switch (error.code) {
    case "42501":
      return "لا تملك صلاحية تنفيذ هذا الإجراء.";
    case "23505":
      return "هذا السجل موجود مسبقًا.";
    case "23514":
    case "22023":
    case "22P02":
      return "بعض البيانات المدخلة غير صحيحة.";
    case "PGRST116":
      return "العنصر المطلوب غير موجود.";
  }
  if (/row-level security/i.test(msg)) return "لا تملك صلاحية تنفيذ هذا الإجراء.";
  return fallback;
}

export function authErrorMessage(error: MaybeError): string {
  const msg = (error?.message ?? "").toLowerCase();
  const code = (error as { code?: string } | null)?.code ?? "";
  if (code === "invalid_credentials" || msg.includes("invalid login")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (code === "email_not_confirmed" || msg.includes("not confirmed")) return "يرجى تأكيد بريدك الإلكتروني أولًا من الرسالة المرسلة إليك.";
  if (code === "user_already_exists" || msg.includes("already registered")) return "تعذّر إنشاء الحساب بهذا البريد. جرّب تسجيل الدخول أو استعادة كلمة المرور.";
  if (code === "weak_password" || msg.includes("password")) return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل مع أرقام وحروف.";
  if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || error?.status === 429)
    return "محاولات كثيرة. انتظر قليلًا ثم حاول مجددًا.";
  if (code === "same_password") return "كلمة المرور الجديدة يجب أن تختلف عن السابقة.";
  return GENERIC_ERROR;
}
