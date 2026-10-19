"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert, Checkbox, Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/form";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "./actions";

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
        <Link href="/forgot-password" className="font-bold text-royal">نسيت كلمة المرور؟</Link>
        <Link href="/register" className="font-bold text-royal">إنشاء حساب جديد</Link>
      </div>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="الاسم الكامل" name="fullName" error={fe.fullName}>
        <Input name="fullName" defaultValue={state.values?.fullName} autoComplete="name" required aria-invalid={!!fe.fullName} />
      </Field>
      <Field label="البريد الإلكتروني" name="email" error={fe.email}>
        <Input name="email" defaultValue={state.values?.email} type="email" autoComplete="email" inputMode="email" dir="ltr" required aria-invalid={!!fe.email} />
      </Field>
      <Field label="كلمة المرور" name="password" error={fe.password} hint="8 أحرف على الأقل، حروف وأرقام">
        <Input name="password" type="password" autoComplete="new-password" dir="ltr" required aria-invalid={!!fe.password} />
      </Field>
      <Checkbox
        name="acceptTerms"
        label={
          <>
            أوافق على <Link href="/terms" className="text-royal underline">الشروط</Link> و<Link href="/privacy" className="text-royal underline">سياسة الخصوصية</Link>
          </>
        }
      />
      {fe.acceptTerms && <p className="text-sm font-bold text-danger">{fe.acceptTerms}</p>}
      <SubmitButton pendingText="جارٍ إنشاء الحساب…">إنشاء الحساب</SubmitButton>
      <p className="text-center text-sm">
        لديك حساب؟ <Link href="/login" className="font-bold text-royal">سجّل الدخول</Link>
      </p>
    </form>
  );
}

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      {state.data?.devLink && (
        <Alert tone="warning">
          بيئة تطوير دون مزود بريد — رابط الاستعادة: <a className="break-all underline" href={state.data.devLink}>{state.data.devLink}</a>
        </Alert>
      )}
      <Field label="البريد الإلكتروني" name="email" error={fe.email}>
        <Input name="email" defaultValue={state.values?.email} type="email" autoComplete="email" inputMode="email" dir="ltr" required aria-invalid={!!fe.email} />
      </Field>
      <SubmitButton pendingText="جارٍ الإرسال…">أرسل رابط الاستعادة</SubmitButton>
      <Link href="/login" className="text-center text-sm font-bold text-royal">العودة لتسجيل الدخول</Link>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <Field label="كلمة المرور الجديدة" name="password" error={fe.password}>
        <Input name="password" type="password" autoComplete="new-password" dir="ltr" required aria-invalid={!!fe.password} />
      </Field>
      <Field label="تأكيد كلمة المرور" name="confirm" error={fe.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" dir="ltr" required aria-invalid={!!fe.confirm} />
      </Field>
      <SubmitButton pendingText="جارٍ الحفظ…">حفظ كلمة المرور</SubmitButton>
    </form>
  );
}
