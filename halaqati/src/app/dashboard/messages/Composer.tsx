"use client";

import { useActionState } from "react";
import { postMessageAction } from "@/app/dashboard/community-actions";
import { Alert } from "@/components/ui";
import { SubmitButton } from "@/components/ui/form";
import type { FormState } from "@/lib/validation/common";

export function Composer({ halaqaId, staff }: { halaqaId: string; staff: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(postMessageAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="halaqaId" value={halaqaId} />
      <label htmlFor="msg-body" className="sr-only">رسالتك</label>
      <textarea id="msg-body" name="body" rows={2} maxLength={1000} required className="input" placeholder={staff ? "اكتب رسالة أو إعلانًا للحلقة…" : "اكتب رسالتك للحلقة…"} defaultValue={state.ok ? "" : state.values?.body} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {staff ? (
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="announcement" className="size-4" /> إعلان (يصل إشعارًا للطلاب وأولياء الأمور)</label>
        ) : <span className="text-xs text-muted">يرى رسالتك المعلّم وزملاؤك وأولياء الأمور في الحلقة.</span>}
        <SubmitButton pendingText="…">إرسال</SubmitButton>
      </div>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
