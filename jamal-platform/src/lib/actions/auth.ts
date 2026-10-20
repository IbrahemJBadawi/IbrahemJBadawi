"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { authProvider, signIn, signOut, signUp } from "@/lib/auth";
import { googleAvailable, googleStartUrl } from "@/lib/auth/google";
import { rateLimit } from "@/lib/rate-limit";

export type AuthState = { error?: string; fieldErrors?: Record<string, string[] | undefined>; info?: string; email?: string };

/** Only allow same-site relative redirects. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/account";
}

const loginSchema = z.object({
  email: z.email("البريد الإلكتروني غير صالح").max(200),
  password: z.string().min(1, "كلمة المرور مطلوبة").max(200),
});

const registerSchema = z.object({
  fullName: z.string().trim().min(2, "الاسم قصير جدًا").max(80),
  email: z.email("البريد الإلكتروني غير صالح").max(200),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").max(200),
});

export async function loginAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!(await rateLimit("login", 10, 15 * 60_000))) return { error: "محاولات كثيرة. حاول بعد 15 دقيقة.", email };
  const parsed = loginSchema.safeParse({ email, password: form.get("password") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };
  const res = await signIn(parsed.data.email, parsed.data.password);
  if (!res.ok) return { error: res.error, email };
  redirect(safeNext(form.get("next")));
}

export async function registerAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!(await rateLimit("register", 5, 60 * 60_000))) return { error: "محاولات كثيرة. حاول لاحقًا.", email };
  const parsed = registerSchema.safeParse({ fullName: form.get("fullName"), email, password: form.get("password") });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, email };
  if (form.get("acceptTerms") !== "on") return { fieldErrors: { acceptTerms: ["يجب الموافقة على الشروط وسياسة الخصوصية"] }, email };
  const res = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
  if (!res.ok) return { error: res.error, email };
  if (res.needsEmailConfirmation) {
    return { info: "تم إنشاء الحساب. أرسلنا رسالة تأكيد إلى بريدك الإلكتروني، يرجى تأكيده ثم تسجيل الدخول.", email };
  }
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}

export async function googleSignInAction(form: FormData) {
  if (!(await rateLimit("google", 20, 15 * 60_000))) redirect("/login?error=rate");
  const provider = authProvider();
  if (!(await googleAvailable(provider))) redirect("/login?error=google");
  let url: string;
  try {
    url = await googleStartUrl(provider, safeNext(form.get("next")));
  } catch {
    redirect("/login?error=google");
  }
  redirect(url);
}
