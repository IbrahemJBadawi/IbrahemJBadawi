"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import type { FormState } from "@/lib/validation/common";

/** Message box; hidden fields identify the conversation for the given server action. */
export function Composer({
  action, hidden, canAnnounce, placeholder, note,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  hidden: Record<string, string>;
  canAnnounce: boolean;
  placeholder: string;
  note?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  return (
    <form action={formAction} className="flex flex-col gap-2">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <label htmlFor="msg-body" className="sr-only">رسالتك</label>
      <textarea id="msg-body" name="body" rows={2} maxLength={2000} required className="input" placeholder={placeholder} defaultValue={state.ok ? "" : state.values?.body} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {canAnnounce ? (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="announcement" className="size-4" /> إعلان (يصل إشعارًا للجميع)</label>
        ) : <span className="text-xs text-muted">{note}</span>}
        <SubmitButton pendingText="…">إرسال</SubmitButton>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
