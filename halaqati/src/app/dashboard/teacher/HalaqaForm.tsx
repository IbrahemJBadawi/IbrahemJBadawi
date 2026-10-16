"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { AUDIENCE, HALAQA_STATUS, LEVEL, MEETING_MODE, WEEKDAYS } from "@/lib/labels";
import type { ScheduleSlot } from "@/lib/format";
import type { FormState } from "@/lib/validation/common";

type Values = {
  id?: string;
  name?: string;
  description?: string | null;
  center_id?: string | null;
  audience_gender?: string;
  age_min?: number | null;
  age_max?: number | null;
  level?: string;
  max_students?: number;
  meeting_mode?: string;
  location_text?: string | null;
  timezone?: string;
  status?: string;
  join_policy?: string;
  schedule?: ScheduleSlot[];
};

type Props = {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  centers: Array<{ id: string; name: string }>;
  values?: Values;
  submitLabel: string;
};

const TIMEZONES = ["Asia/Riyadh", "Asia/Dubai", "Asia/Amman", "Asia/Jerusalem", "Asia/Baghdad", "Asia/Kuwait", "Asia/Qatar", "Africa/Cairo", "Africa/Casablanca", "Africa/Algiers", "Africa/Tunis", "Europe/Istanbul", "Europe/London", "Europe/Berlin", "America/New_York", "UTC"];

export function HalaqaForm({ action, centers, values = {}, submitLabel }: Props) {
  const [state, formAction] = useActionState(action, {});
  const [slots, setSlots] = useState<Array<Partial<ScheduleSlot>>>(values.schedule?.length ? values.schedule : [{}]);
  const fe = state.fieldErrors ?? {};
  const tz = values.timezone ?? (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "Asia/Riyadh");
  const tzOptions = TIMEZONES.includes(tz) ? TIMEZONES : [tz, ...TIMEZONES];

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-bold text-brand-800">البيانات الأساسية</legend>
        <div className="sm:col-span-2">
          <Field label="اسم الحلقة" name="name" error={fe.name}>
            <Input name="name" defaultValue={values.name} required aria-invalid={!!fe.name} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="الوصف" name="description" error={fe.description} hint="لا تكتب عناوين سكن أو بيانات شخصية للطلاب">
            <Textarea name="description" defaultValue={values.description ?? ""} rows={4} maxLength={2000} />
          </Field>
        </div>
        <Field label="التبعية" name="centerId" error={fe.centerId} hint={centers.length ? undefined : "الحلقة مستقلة؛ لا تحتاج إلى مركز"}>
          <Select name="centerId" defaultValue={values.center_id ?? ""} disabled={!centers.length && !values.center_id}>
            <option value="">حلقة مستقلة</option>
            {centers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="الحالة" name="status">
          <Select name="status" defaultValue={values.status ?? "draft"}>
            {Object.entries(HALAQA_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-bold text-brand-800">الطلاب</legend>
        <Field label="الفئة" name="audienceGender">
          <Select name="audienceGender" defaultValue={values.audience_gender ?? "mixed"}>
            {Object.entries(AUDIENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="المستوى" name="level">
          <Select name="level" defaultValue={values.level ?? "all"}>
            {Object.entries(LEVEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="العمر من (اختياري)" name="ageMin" error={fe.ageMin}>
          <Input name="ageMin" type="number" inputMode="numeric" defaultValue={values.age_min ?? ""} />
        </Field>
        <Field label="العمر إلى (اختياري)" name="ageMax" error={fe.ageMax}>
          <Input name="ageMax" type="number" inputMode="numeric" defaultValue={values.age_max ?? ""} />
        </Field>
        <Field label="الحد الأقصى للطلاب" name="maxStudents" error={fe.maxStudents}>
          <Input name="maxStudents" type="number" inputMode="numeric" min={1} max={300} defaultValue={values.max_students ?? 20} required />
        </Field>
        <Field label="سياسة الانضمام" name="joinPolicy">
          <Select name="joinPolicy" defaultValue={values.join_policy === "open" ? "open" : "approval"}>
            <option value="approval">بموافقة المحفّظ</option>
            <option value="open">انضمام مباشر</option>
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-bold text-brand-800">اللقاءات</legend>
        <Field label="نوع اللقاء" name="meetingMode">
          <Select name="meetingMode" defaultValue={values.meeting_mode ?? "remote"}>
            {Object.entries(MEETING_MODE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="المنطقة الزمنية" name="timezone" error={fe.timezone}>
          <Select name="timezone" defaultValue={tz} dir="ltr">
            {tzOptions.map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="المكان (المدينة أو الحي فقط، اختياري)" name="locationText" error={fe.locationText}>
            <Input name="locationText" defaultValue={values.location_text ?? ""} maxLength={200} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <span className="font-semibold">المواعيد الأسبوعية</span>
          {slots.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
              <Select name="slot_day" defaultValue={s.day ?? ""} aria-label={`اليوم ${i + 1}`}>
                <option value="">اليوم</option>
                {WEEKDAYS.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
              </Select>
              <Input name="slot_start" type="time" defaultValue={s.start ?? ""} aria-label={`وقت البداية ${i + 1}`} dir="ltr" />
              <Input name="slot_duration" type="number" inputMode="numeric" min={10} max={600} defaultValue={s.duration ?? 60} aria-label={`المدة بالدقائق ${i + 1}`} />
              <Button type="button" variant="ghost" onClick={() => setSlots(slots.filter((_, j) => j !== i))} aria-label="حذف الموعد">✕</Button>
            </div>
          ))}
          {fe.schedule && <p className="text-sm font-semibold text-danger">{fe.schedule}</p>}
          {slots.length < 14 && (
            <Button type="button" variant="secondary" className="self-start" onClick={() => setSlots([...slots, {}])}>إضافة موعد</Button>
          )}
        </div>
      </fieldset>

      <SubmitButton className="self-start">{submitLabel}</SubmitButton>
    </form>
  );
}
