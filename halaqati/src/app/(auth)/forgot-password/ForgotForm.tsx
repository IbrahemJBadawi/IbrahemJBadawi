"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { forgotPasswordAction } from "../actions";

export function ForgotForm() {
  const [state, action] = useActionState(forgotPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="البريد الإلكتروني" name="email" error={fe.email}>
        <Input name="email" defaultValue={state.values?.email} type="email" autoComplete="email" inputMode="email" dir="ltr" required aria-invalid={!!fe.email} />
      </Field>
      <SubmitButton pendingText="جارٍ الإرسال…">إرسال رابط الاستعادة</SubmitButton>
      <Link href="/login" className="text-sm font-semibold text-brand-800 underline">العودة لتسجيل الدخول</Link>
    </form>
  );
}
