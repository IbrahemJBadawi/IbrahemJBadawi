"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { Notice } from "@/components/ui/States";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="البريد الإلكتروني" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" className="text-end" required defaultValue={state.email} />
      </Field>
      <Field label="كلمة المرور" htmlFor="password" error={fe.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" dir="ltr" className="text-end" required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "جارٍ الدخول…" : "تسجيل الدخول"}</Button>
      <p className="text-center text-sm text-muted">
        ليس لديك حساب؟ <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline">إنشاء حساب</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerAction, {});
  const fe = state.fieldErrors ?? {};
  if (state.info) return <Notice tone="success">{state.info}</Notice>;
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />
      {state.error && <Notice tone="error">{state.error}</Notice>}
      <Field label="الاسم الكامل" htmlFor="fullName" error={fe.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="البريد الإلكتروني" htmlFor="email" error={fe.email}>
        <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" className="text-end" required defaultValue={state.email} />
      </Field>
      <Field label="كلمة المرور" htmlFor="password" error={fe.password} hint="8 أحرف على الأقل">
        <Input id="password" name="password" type="password" autoComplete="new-password" dir="ltr" className="text-end" required minLength={8} />
      </Field>
      <Checkbox
        name="acceptTerms"
        label={<>أوافق على <Link href="/policies/terms" target="_blank" className="underline">الشروط</Link> و<Link href="/policies/privacy" target="_blank" className="underline">سياسة الخصوصية</Link></>}
      />
      {fe.acceptTerms && <p className="text-xs text-danger">{fe.acceptTerms[0]}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "جارٍ الإنشاء…" : "إنشاء الحساب"}</Button>
      <p className="text-center text-sm text-muted">
        لديك حساب؟ <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ink underline">تسجيل الدخول</Link>
      </p>
    </form>
  );
}
