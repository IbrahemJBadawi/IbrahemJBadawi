"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { MEETING_MODE } from "@/lib/labels";
import { createSessionAction } from "./actions";

export function SessionForm({ halaqaId, defaultMode, defaultStart, lastMeetingUrl, timezone }: {
  halaqaId: string;
  defaultMode: string;
  defaultStart: string;
  lastMeetingUrl?: string | null;
  timezone: string;
}) {
  const [state, action] = useActionState(createSessionAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <input type="hidden" name="halaqaId" value={halaqaId} />
      <Field label={`الموعد (بتوقيت ${timezone})`} name="startsAt" error={fe.startsAt}>
        <Input name="startsAt" type="datetime-local" defaultValue={defaultStart} required dir="ltr" />
      </Field>
      <Field label="المدة بالدقائق" name="durationMinutes" error={fe.durationMinutes}>
        <Input name="durationMinutes" type="number" inputMode="numeric" min={5} max={600} defaultValue={60} />
      </Field>
      <Field label="نوع اللقاء" name="mode">
        <Select name="mode" defaultValue={defaultMode}>
          {Object.entries(MEETING_MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <Field label="رابط الاجتماع (للأعضاء فقط)" name="meetingUrl" error={fe.meetingUrl}>
        <Input name="meetingUrl" type="url" inputMode="url" dir="ltr" placeholder="https://" defaultValue={lastMeetingUrl ?? ""} />
      </Field>
      <Field label="المكان (اختياري)" name="locationText"><Input name="locationText" maxLength={200} /></Field>
      <Field label="الموضوع (اختياري)" name="topic"><Input name="topic" maxLength={200} /></Field>
      <div className="sm:col-span-2"><SubmitButton>إضافة الجلسة</SubmitButton></div>
    </form>
  );
}
