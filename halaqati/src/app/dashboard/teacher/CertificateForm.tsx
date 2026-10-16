"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { CERTIFICATE_KIND } from "@/lib/labels";
import { issueCertificateAction } from "../feature-actions";

export function CertificateForm({ halaqaId, studentId }: { halaqaId: string; studentId: string }) {
  const [state, action] = useActionState(issueCertificateAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      {state.serial && <p><Link href={`/verify/${state.serial}`} className="font-semibold text-brand-800 underline">عرض الشهادة {state.serial}</Link></p>}
      <input type="hidden" name="halaqaId" value={halaqaId} />
      <input type="hidden" name="studentId" value={studentId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="نوع الإنجاز" name="cert-kind">
          <Select id="cert-kind" name="kind" defaultValue="juz_completion">
            {Object.entries(CERTIFICATE_KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="عنوان الشهادة" name="cert-title" error={fe.title}>
          <Input id="cert-title" name="title" placeholder="مثل: إتمام حفظ جزء عمّ" maxLength={150} />
        </Field>
        <Field label="العنوان بالإنجليزية (اختياري)" name="cert-title-en">
          <Input id="cert-title-en" name="titleEn" dir="ltr" placeholder="Juz Amma memorization" maxLength={150} />
        </Field>
        <Field label="وصف (اختياري)" name="cert-desc">
          <Input id="cert-desc" name="description" maxLength={500} />
        </Field>
      </div>
      <SubmitButton variant="secondary" className="self-start">إصدار الشهادة</SubmitButton>
    </form>
  );
}
