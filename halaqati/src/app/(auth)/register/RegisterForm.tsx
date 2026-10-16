"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { CONTEXT_LABELS, ROLE_DESCRIPTIONS, SELF_SERVICE_ROLES } from "@/lib/roles";
import { registerAction } from "../actions";

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="الاسم الكامل" name="fullName" error={fe.fullName}>
        <Input name="fullName" autoComplete="name" required aria-invalid={!!fe.fullName} />
      </Field>
      <Field label="البريد الإلكتروني" name="email" error={fe.email}>
        <Input name="email" type="email" autoComplete="email" inputMode="email" dir="ltr" required aria-invalid={!!fe.email} />
      </Field>
      <Field label="كلمة المرور" name="password" error={fe.password} hint="8 أحرف على الأقل، حروف وأرقام">
        <Input name="password" type="password" autoComplete="new-password" dir="ltr" required aria-invalid={!!fe.password} />
      </Field>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">كيف ستستخدم حلقتي؟ (يمكن اختيار أكثر من دور)</legend>
        {SELF_SERVICE_ROLES.map((role) => (
          <label key={role} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-line p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
            <input type="checkbox" name="roles" value={role} defaultChecked={role === "student"} className="mt-1 size-5 accent-brand-800" />
            <span>
              <span className="block font-semibold">{CONTEXT_LABELS[role]}</span>
              <span className="block text-sm text-muted">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </label>
        ))}
        {fe.roles && <p className="text-sm font-semibold text-danger">{fe.roles}</p>}
      </fieldset>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="acceptTerms" className="mt-1 size-5 accent-brand-800" />
        <span className="text-sm">
          أوافق على <Link href="/terms" className="font-semibold text-brand-800 underline">شروط الاستخدام</Link> و
          <Link href="/privacy" className="font-semibold text-brand-800 underline">سياسة الخصوصية</Link>.
        </span>
      </label>
      {fe.acceptTerms && <p className="text-sm font-semibold text-danger">{fe.acceptTerms}</p>}
      <SubmitButton pendingText="جارٍ إنشاء الحساب…">إنشاء الحساب</SubmitButton>
      <p className="text-sm text-muted">
        لديك حساب؟ <Link href="/login" className="font-semibold text-brand-800 underline">سجّل الدخول</Link>
      </p>
    </form>
  );
}
