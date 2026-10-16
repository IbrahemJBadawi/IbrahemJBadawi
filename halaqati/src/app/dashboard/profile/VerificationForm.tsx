"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { submitVerificationAction } from "../feature-actions";

export function VerificationForm() {
  const [state, action] = useActionState(submitVerificationAction, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <Field label="مؤهلاتك" name="qualifications" error={fe.qualifications} hint="الإجازة والرواية والسند، وسنوات الخبرة، والجهات التي درّست فيها">
        <Textarea name="qualifications" rows={4} maxLength={2000} required />
      </Field>
      <Field label="رابط يدعم طلبك (اختياري)" name="evidenceUrl" error={fe.evidenceUrl} hint="صفحة جهة أو ملف منشور. لا ترفع وثائق هوية">
        <Input name="evidenceUrl" type="url" dir="ltr" placeholder="https://" />
      </Field>
      <SubmitButton variant="secondary" className="self-start">إرسال طلب التوثيق</SubmitButton>
    </form>
  );
}
