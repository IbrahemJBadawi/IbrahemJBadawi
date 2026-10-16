"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { ATTENDANCE } from "@/lib/labels";
import { saveAttendanceAction } from "./actions";

type Row = { studentId: string; name: string; status: string | null };

export function AttendanceForm({ sessionId, rows }: { sessionId: string; rows: Row[] }) {
  const [state, action] = useActionState(saveAttendanceAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.studentId} className="py-3">
            <fieldset>
              <legend className="mb-2 font-semibold">{r.name}</legend>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ATTENDANCE).map(([k, v]) => (
                  <label key={k} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                    <input type="radio" name={`att_${r.studentId}`} value={k} defaultChecked={r.status === k} className="size-4 accent-brand-800" />
                    {v}
                  </label>
                ))}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <SubmitButton className="self-start">حفظ الحضور</SubmitButton>
    </form>
  );
}
