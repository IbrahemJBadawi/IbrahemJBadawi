"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="البريد الإلكتروني" name="email" error={fe.email}>
        <Input name="email" defaultValue={state.values?.email} type="email" autoComplete="email" inputMode="email" dir="ltr" required aria-invalid={!!fe.email} />
      </Field>
      <Field label="كلمة المرور" name="password" error={fe.password}>
        <Input name="password" type="password" autoComplete="current-password" dir="ltr" required aria-invalid={!!fe.password} />
      </Field>
      <SubmitButton pendingText="جارٍ الدخول…">تسجيل الدخول</SubmitButton>
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <Link href="/forgot-password" className="font-semibold text-brand-800 underline">نسيت كلمة المرور؟</Link>
        <Link href="/register" className="font-semibold text-brand-800 underline">إنشاء حساب جديد</Link>
      </div>
    </form>
  );
}
