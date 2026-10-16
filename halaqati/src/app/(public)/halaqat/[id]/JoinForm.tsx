"use client";

import { useActionState } from "react";
import { Field, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { requestJoinAction } from "./actions";

export function JoinForm({ halaqaId, needsApproval }: { halaqaId: string; needsApproval: boolean }) {
  const [state, action] = useActionState(requestJoinAction, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="halaqaId" value={halaqaId} />
      {needsApproval && (
        <Field label="رسالة للمحفّظ (اختياري)" name="message" hint="مثلًا: مقدار حفظك الحالي">
          <Textarea name="message" maxLength={500} rows={3} />
        </Field>
      )}
      <SubmitButton pendingText="جارٍ الإرسال…">{needsApproval ? "طلب الانضمام" : "انضم الآن"}</SubmitButton>
    </form>
  );
}
