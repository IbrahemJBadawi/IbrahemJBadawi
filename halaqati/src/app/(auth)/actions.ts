"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { authErrorMessage } from "@/lib/errors";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { forgotSchema, loginSchema, registerSchema, resetSchema, safeNext } from "@/lib/validation/auth";
import { invalid, type FormState } from "@/lib/validation/common";

const TOO_MANY: FormState = { ok: false, error: "محاولات كثيرة. انتظر بضع دقائق ثم حاول مجددًا." };

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    fullName: fd.get("fullName"),
    email: fd.get("email"),
    password: fd.get("password"),
    roles: fd.getAll("roles"),
    acceptTerms: fd.get("acceptTerms") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const ip = await clientIp();
  if (!(await rateLimit(`register:${ip}`, 5, 3600))) return TOO_MANY;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, roles: parsed.data.roles },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { ok: false, error: authErrorMessage(error) };
  if (data.session) redirect("/dashboard");
  return {
    ok: true,
    message: "تم إنشاء الحساب. أرسلنا رسالة تأكيد إلى بريدك الإلكتروني؛ افتح الرابط لتفعيل الحساب ثم سجّل الدخول.",
  };
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: fd.get("email"),
    password: fd.get("password"),
    next: fd.get("next") ?? undefined,
  });
  if (!parsed.success) return invalid(parsed.error);
  const ip = await clientIp();
  if (!(await rateLimit(`login:ip:${ip}`, 20, 900)) || !(await rateLimit(`login:email:${parsed.data.email}`, 8, 900))) {
    return TOO_MANY;
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) return { ok: false, error: authErrorMessage(error) };
  redirect(safeNext(parsed.data.next));
}

export async function forgotPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse({ email: fd.get("email") });
  if (!parsed.success) return invalid(parsed.error);
  const ip = await clientIp();
  if (!(await rateLimit(`forgot:${ip}`, 5, 3600))) return TOO_MANY;
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the account exists (no account enumeration).
  return { ok: true, message: "إذا كان البريد مسجّلًا لدينا فستصلك رسالة تتضمن رابط إعادة تعيين كلمة المرور." };
}

export async function resetPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { ok: false, error: "انتهت صلاحية رابط الاستعادة. اطلب رابطًا جديدًا." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authErrorMessage(error) };
  redirect("/dashboard?password=updated");
}
