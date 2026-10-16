"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { resetPasswordAction } from "../actions";

export function ResetForm() {
  const [state, action] = useActionState(resetPasswordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="كلمة المرور الجديدة" name="password" error={fe.password} hint="8 أحرف على الأقل، حروف وأرقام">
        <Input name="password" type="password" autoComplete="new-password" dir="ltr" required aria-invalid={!!fe.password} />
      </Field>
      <Field label="تأكيد كلمة المرور" name="confirm" error={fe.confirm}>
        <Input name="confirm" type="password" autoComplete="new-password" dir="ltr" required aria-invalid={!!fe.confirm} />
      </Field>
      <SubmitButton>حفظ كلمة المرور</SubmitButton>
    </form>
  );
}
