"use client";

import { useActionState } from "react";
import { addTaskAction, logWirdAction } from "@/app/dashboard/motivation-actions";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { Input, Select } from "@/components/ui";
import type { FormState } from "@/lib/validation/common";

export function WirdForm({ today }: { today: number | null }) {
  const [state, action] = useActionState<FormState, FormData>(logWirdAction, {});
  if (today) {
    return <p className="font-semibold text-brand-800">✓ سجّلت وردك اليوم: {today} صفحة</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label htmlFor="wird-pages" className="mb-1 block text-sm font-semibold">كم صفحة قرأت اليوم؟</label>
          <Input id="wird-pages" name="pages" type="number" inputMode="numeric" min={1} max={604} required placeholder="مثلًا 5" aria-invalid={Boolean(state.fieldErrors?.pages)} />
        </div>
        <SubmitButton pendingText="…">سجّل الورد</SubmitButton>
      </div>
      {state.fieldErrors?.pages && <p className="text-sm font-semibold text-danger">{state.fieldErrors.pages}</p>}
      <FormMessage state={state.error ? state : undefined} />
    </form>
  );
}

export function TaskForm({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(addTaskAction, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="task-title" className="mb-1 block text-sm font-semibold">مهمة جديدة</label>
          <Input id="task-title" name="title" required minLength={2} maxLength={150} placeholder="مثلًا: مراجعة سورة الملك" defaultValue={state.values?.title} aria-invalid={Boolean(state.fieldErrors?.title)} />
        </div>
        {!compact && (
          <>
            <div>
              <label htmlFor="task-due" className="mb-1 block text-sm font-semibold">الموعد</label>
              <Input id="task-due" name="due_on" type="date" />
            </div>
            <div>
              <label htmlFor="task-priority" className="mb-1 block text-sm font-semibold">الأولوية</label>
              <Select id="task-priority" name="priority" defaultValue="2">
                <option value="1">عالية</option>
                <option value="2">عادية</option>
                <option value="3">منخفضة</option>
              </Select>
            </div>
          </>
        )}
        <SubmitButton pendingText="…">إضافة</SubmitButton>
      </div>
      {state.fieldErrors?.title && <p className="text-sm font-semibold text-danger">{state.fieldErrors.title}</p>}
      <FormMessage state={state} />
    </form>
  );
}
