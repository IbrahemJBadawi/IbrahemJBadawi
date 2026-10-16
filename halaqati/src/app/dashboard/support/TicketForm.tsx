"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { TICKET_CATEGORY } from "@/lib/labels";
import { createTicketAction } from "../feature-actions";

export function TicketForm({ category, path }: { category?: string; path?: string }) {
  const [state, action] = useActionState(createTicketAction, {});
  const fe = state.fieldErrors ?? {};
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <Field label="النوع" name="category">
        <Select name="category" defaultValue={category && category in TICKET_CATEGORY ? category : "technical"}>
          {Object.entries(TICKET_CATEGORY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="العنوان" name="subject" error={fe.subject}><Input name="subject" maxLength={150} required /></Field>
      <Field label="التفاصيل" name="body" error={fe.body} hint="لا تكتب كلمات مرور أو بيانات حساسة">
        <Textarea name="body" rows={5} maxLength={3000} required />
      </Field>
      <input type="hidden" name="relatedPath" value={path ?? ""} />
      {path && <p className="text-sm text-muted">مرتبط بالصفحة: <span dir="ltr">{path}</span></p>}
      <SubmitButton className="self-start">إرسال</SubmitButton>
    </form>
  );
}
