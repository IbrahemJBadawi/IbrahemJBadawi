"use server";

import { redirect } from "next/navigation";
import { authSecretStatus, createPasswordReset, resetPassword, signIn, signUp } from "@/lib/auth";
import { emailLayout, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { logError } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { requestOrigin } from "@/lib/request";
import { formValues, invalid, safeNext, type FormState } from "@/lib/validation/common";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation/schemas";

const TOO_MANY: FormState = { ok: false, error: "محاولات كثيرة. انتظر بضع دقائق ثم حاول مجددًا." };
const NOT_READY: FormState = { ok: false, error: "تسجيل الدخول غير مهيّأ على الخادم بعد (AUTH_SECRET). تواصل مع مسؤول المنصة." };

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, "fullName", "email");
  const parsed = registerSchema.safeParse({
    fullName: fd.get("fullName"),
    email: fd.get("email"),
    password: fd.get("password"),
    acceptTerms: fd.get("acceptTerms") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error, values);
  if (authSecretStatus() === "missing") return NOT_READY;
  if (!(await rateLimit(`register:${await clientIp()}`, 5, 3600))) return { ...TOO_MANY, values };
  let res;
  try {
    res = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
  } catch (e) {
    logError("register", e);
    return { ok: false, error: "تعذّر إنشاء الحساب الآن. حاول مرة أخرى.", values };
  }
  if (!res.ok) return { ok: false, error: res.error, values };
  redirect("/onboarding");
}

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, "email");
  const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
  if (!parsed.success) return invalid(parsed.error, values);
  if (authSecretStatus() === "missing") return NOT_READY;
  const ip = await clientIp();
  if (!(await rateLimit(`login:ip:${ip}`, 20, 900)) || !(await rateLimit(`login:email:${parsed.data.email}`, 8, 900))) {
    return { ...TOO_MANY, values };
  }
  let res;
  try {
    res = await signIn(parsed.data.email, parsed.data.password);
  } catch (e) {
    logError("login", e);
    return { ok: false, error: "تعذّر تسجيل الدخول الآن. حاول مرة أخرى.", values };
  }
  if (!res.ok) return { ok: false, error: res.error, values };
  redirect(safeNext(String(fd.get("next") ?? "")));
}

export async function forgotPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, "email");
  const parsed = forgotSchema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return invalid(parsed.error, values);
  if (!(await rateLimit(`forgot:${await clientIp()}`, 5, 3600))) return { ...TOO_MANY, values };
  const generic: FormState = { ok: true, message: "إذا كان البريد مسجّلًا لدينا فستصلك رسالة فيها رابط لإعادة تعيين كلمة المرور خلال دقائق." };
  try {
    const token = await createPasswordReset(parsed.data.email);
    if (!token) return generic; // same answer: no account enumeration
    const link = `${await requestOrigin()}/reset-password?token=${token}`;
    const mail = emailLayout("إعادة تعيين كلمة المرور", ["طلبت إعادة تعيين كلمة مرور حسابك في TechMood Growth.", "الرابط صالح لساعة واحدة ولمرة واحدة. إن لم تطلب ذلك فتجاهل الرسالة."], {
      label: "تعيين كلمة مرور جديدة",
      url: link,
    });
    const sent = await sendEmail(parsed.data.email, "إعادة تعيين كلمة المرور", mail.html, mail.text);
    if (sent.status !== "sent" && !env.isProduction) {
      // Local development without an email provider: show the link here.
      return { ...generic, data: { devLink: link } };
    }
    if (sent.status === "not_configured") logError("forgot", { message: "email provider not configured; reset email not sent" });
  } catch (e) {
    logError("forgot", e);
  }
  return generic;
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({ token: fd.get("token"), password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return invalid(parsed.error);
  if (!(await rateLimit(`reset:${await clientIp()}`, 10, 3600))) return TOO_MANY;
  const res = await resetPassword(parsed.data.token, parsed.data.password);
  if (!res.ok) return { ok: false, error: res.error };
  redirect("/dashboard?password=updated");
}
