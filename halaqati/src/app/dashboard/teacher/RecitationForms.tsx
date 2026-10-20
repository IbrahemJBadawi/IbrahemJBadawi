"use client";

import { useActionState, useState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { ScoreSelect, SurahRangeFields } from "@/components/forms/SurahRangeFields";
import { ACTIVITY, ADHERENCE, COMPLETION, ERROR_TYPE } from "@/lib/labels";
import { SURAHS } from "@/lib/quran/surahs";
import type { Assignment, ProgressRecord } from "@/lib/types";
import { amendRecordAction, createAssignmentAction, recordRecitationAction } from "./actions";

export function RecitationForm({ halaqaId, studentId, sessionId, assignment }: {
  halaqaId: string;
  studentId: string;
  sessionId?: string | null;
  assignment?: Assignment | null;
}) {
  const [state, action] = useActionState(recitationAction, {});
  const [errors, setErrors] = useState<number[]>([]);
  const [key, setKey] = useState(0);
  const fe = state.fieldErrors ?? {};
  async function recitationAction(prev: Parameters<typeof recordRecitationAction>[0], fd: FormData) {
    const res = await recordRecitationAction(prev, fd);
    if (res.ok) { setErrors([]); setKey((k) => k + 1); }
    return res;
  }
  return (
    <form key={key} action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="halaqaId" value={halaqaId} />
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="sessionId" value={sessionId ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نوع النشاط" name="rec-activity">
          <Select id="rec-activity" name="activity" defaultValue={assignment?.activity ?? "new_memorization"}>
            {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="مرتبط بواجب" name="assignmentId" hint="يُحدَّث حال الواجب تلقائيًا عند الاعتماد">
          <Select name="assignmentId" defaultValue={assignment?.id ?? ""}>
            <option value="">بدون</option>
            {assignment && <option value={assignment.id}>الواجب الحالي</option>}
          </Select>
        </Field>
      </div>
      <SurahRangeFields errors={fe} idPrefix="rec-" defaults={assignment ? { surahFrom: assignment.surah_from, ayahFrom: assignment.ayah_from, surahTo: assignment.surah_to, ayahTo: assignment.ayah_to } : undefined} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="حالة الإنجاز" name="rec-completion">
          <Select id="rec-completion" name="completion" defaultValue="completed">
            {Object.entries(COMPLETION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="الالتزام بالخطة" name="rec-adherence">
          <Select id="rec-adherence" name="planAdherence" defaultValue={assignment ? "met" : "no_plan"}>
            {Object.entries(ADHERENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <ScoreSelect id="rec-mastery" name="masteryScore" label="إتقان الحفظ" error={fe.masteryScore} />
        <ScoreSelect id="rec-recitation" name="recitationScore" label="جودة التلاوة والتجويد" error={fe.recitationScore} />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">الأخطاء الملحوظة</legend>
        {errors.map((id, i) => (
          <div key={id} className="grid grid-cols-2 gap-2 rounded-lg border border-line p-2 sm:grid-cols-[1.3fr_1.3fr_0.7fr_2fr_auto]">
            <Select name="err_type" aria-label={`نوع الخطأ ${i + 1}`} defaultValue="memorization">
              {Object.entries(ERROR_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Select name="err_surah" aria-label={`السورة ${i + 1}`} defaultValue="">
              <option value="">السورة</option>
              {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.name}</option>)}
            </Select>
            <Input name="err_ayah" type="number" inputMode="numeric" min={1} placeholder="آية" aria-label={`الآية ${i + 1}`} />
            <Input name="err_note" placeholder="ملاحظة" maxLength={500} aria-label={`ملاحظة ${i + 1}`} />
            <Button type="button" variant="ghost" onClick={() => setErrors(errors.filter((e) => e !== id))} aria-label="حذف الخطأ">✕</Button>
          </div>
        ))}
        <Button type="button" variant="secondary" className="self-start" onClick={() => setErrors([...errors, Date.now()])}>إضافة خطأ</Button>
      </fieldset>
      <Field label="ملاحظات المحفّظ" name="rec-notes">
        <Textarea id="rec-notes" name="teacherNotes" rows={3} maxLength={2000} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="approve">اعتماد التسميع</SubmitButton>
        <SubmitButton name="intent" value="draft" variant="secondary">حفظ كمسودة</SubmitButton>
      </div>
      <p className="text-sm text-muted">بعد الاعتماد يظهر السجل للطالب ووليّ أمره، ولا يُعدَّل إلا بسبب موثّق.</p>
    </form>
  );
}

export function AssignmentForm({ halaqaId, studentId, defaults }: { halaqaId: string; studentId: string; defaults?: { surahFrom: number; ayahFrom: number } }) {
  const [state, action] = useActionState(createAssignmentAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="halaqaId" value={halaqaId} />
      <input type="hidden" name="studentId" value={studentId} />
      <Field label="نوع الواجب" name="asg-activity">
        <Select id="asg-activity" name="activity" defaultValue="new_memorization">
          {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <SurahRangeFields errors={fe} idPrefix="asg-" defaults={defaults} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="موعد التسميع" name="asg-dueOn" error={fe.dueOn}>
          <Input id="asg-dueOn" name="dueOn" type="date" dir="ltr" />
        </Field>
        <Field label="توجيهات (اختياري)" name="asg-instructions">
          <Input id="asg-instructions" name="instructions" maxLength={1000} />
        </Field>
      </div>
      <SubmitButton className="self-start">تحديد الواجب</SubmitButton>
    </form>
  );
}

export function AmendForm({ record }: { record: ProgressRecord }) {
  const [state, action] = useActionState(amendRecordAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="mt-3 flex flex-col gap-3 rounded-lg bg-ivory p-3" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="recordId" value={record.id} />
      <input type="hidden" name="halaqaId" value={record.halaqa_id} />
      <input type="hidden" name="studentId" value={record.student_id} />
      <SurahRangeFields errors={fe} idPrefix={`am-${record.id}-`} defaults={{ surahFrom: record.surah_from, ayahFrom: record.ayah_from, surahTo: record.surah_to, ayahTo: record.ayah_to }} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="حالة الإنجاز" name={`am-${record.id}-completion`}>
          <Select id={`am-${record.id}-completion`} name="completion" defaultValue={record.completion}>
            {Object.entries(COMPLETION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="الالتزام بالخطة" name={`am-${record.id}-adh`}>
          <Select id={`am-${record.id}-adh`} name="planAdherence" defaultValue={record.plan_adherence}>
            {Object.entries(ADHERENCE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <ScoreSelect id={`am-${record.id}-mastery`} name="masteryScore" label="إتقان الحفظ" error={fe.masteryScore} defaultValue={record.mastery_score} />
        <ScoreSelect id={`am-${record.id}-recitation`} name="recitationScore" label="جودة التلاوة" defaultValue={record.recitation_score} />
      </div>
      <Field label="ملاحظات" name={`am-${record.id}-notes`}>
        <Textarea id={`am-${record.id}-notes`} name="teacherNotes" defaultValue={record.teacher_notes ?? ""} rows={2} />
      </Field>
      <Field label="سبب التعديل (إلزامي)" name={`am-${record.id}-reason`} error={fe.reason}>
        <Input id={`am-${record.id}-reason`} name="reason" required minLength={5} aria-invalid={!!fe.reason} />
      </Field>
      <SubmitButton variant="secondary" className="self-start">حفظ التعديل</SubmitButton>
    </form>
  );
}
