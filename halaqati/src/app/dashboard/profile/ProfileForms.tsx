"use client";

import { useActionState } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { CONTEXT_LABELS, ROLE_DESCRIPTIONS, type AppRole } from "@/lib/roles";
import { changeMyRoleAction, createPrivacyRequestAction, updateProfileAction } from "../actions";
import { createLinkCodeAction } from "./parent-link-actions";

type Profile = {
  full_name: string;
  display_name: string | null;
  bio: string | null;
  directory_visible: boolean;
  gender: string | null;
  birth_year: number | null;
  country: string | null;
  city: string | null;
};

export function ProfileForm({ p }: { p: Profile }) {
  const [state, action] = useActionState(updateProfileAction, {});
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <Field label="الاسم الكامل" name="fullName" error={fe.fullName}>
        <Input name="fullName" defaultValue={p.full_name} required aria-invalid={!!fe.fullName} />
      </Field>
      <Field label="الاسم الظاهر (اختياري)" name="displayName" error={fe.displayName}>
        <Input name="displayName" defaultValue={p.display_name ?? ""} />
      </Field>
      <Field label="الجنس (اختياري)" name="gender" hint="يُستخدم لاقتراح الحلقات المناسبة فقط">
        <Select name="gender" defaultValue={p.gender ?? ""}>
          <option value="">بدون تحديد</option>
          <option value="male">ذكر</option>
          <option value="female">أنثى</option>
        </Select>
      </Field>
      <Field label="سنة الميلاد (اختياري)" name="birthYear" error={fe.birthYear} hint="نكتفي بالسنة لا التاريخ الكامل">
        <Input name="birthYear" inputMode="numeric" defaultValue={p.birth_year ?? ""} aria-invalid={!!fe.birthYear} />
      </Field>
      <Field label="الدولة (اختياري)" name="country"><Input name="country" defaultValue={p.country ?? ""} /></Field>
      <Field label="المدينة (اختياري)" name="city"><Input name="city" defaultValue={p.city ?? ""} /></Field>
      <div className="sm:col-span-2">
        <Field label="نبذة (اختياري)" name="bio" error={fe.bio}>
          <Textarea name="bio" defaultValue={p.bio ?? ""} maxLength={1000} rows={3} />
        </Field>
      </div>
      <label className="flex items-start gap-3 sm:col-span-2">
        <input type="checkbox" name="directoryVisible" defaultChecked={p.directory_visible} className="mt-1 size-5 accent-brand-800" />
        <span>إظهار اسمي ونبذتي في دليل المحفّظين العام (للمحفّظين والمعلمين فقط)</span>
      </label>
      <div className="sm:col-span-2"><SubmitButton>حفظ البيانات</SubmitButton></div>
    </form>
  );
}

export function RoleToggle({ role, has }: { role: AppRole; has: boolean }) {
  const [state, action] = useActionState(changeMyRoleAction, {});
  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-line p-3">
      <div className="flex items-center justify-between gap-2">
        <span>
          <span className="block font-semibold">{CONTEXT_LABELS[role]}</span>
          <span className="block text-sm text-muted">{ROLE_DESCRIPTIONS[role]}</span>
        </span>
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="op" value={has ? "remove" : "add"} />
        <SubmitButton variant={has ? "secondary" : "primary"} pendingText="…">{has ? "إزالة" : "إضافة"}</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function LinkCodeGenerator() {
  const [state, action, pending] = useActionState(createLinkCodeAction, {});
  return (
    <div className="flex flex-col gap-3">
      {state.code ? (
        <div className="rounded-lg border border-gold bg-gold-50 p-4 text-center">
          <p className="text-sm text-muted">أعطِ هذا الرمز لوليّ أمرك فقط. صالح لمدة 48 ساعة ولمرة واحدة.</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-brand-900" dir="ltr">{state.code}</p>
        </div>
      ) : (
        <FormMessage state={state} />
      )}
      <form action={action}>
        <Button type="submit" variant="secondary" disabled={pending}>{state.code ? "إنشاء رمز جديد" : "إنشاء رمز ربط وليّ الأمر"}</Button>
      </form>
    </div>
  );
}

export function PrivacyRequestForm({ kind, label }: { kind: "export" | "delete"; label: string }) {
  const [state, action] = useActionState(createPrivacyRequestAction, {});
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-2">
      <FormMessage state={state} />
      <input type="hidden" name="kind" value={kind} />
      {kind === "delete" && (
        <Field label="سبب الحذف (اختياري)" name={`reason-${kind}`}>
          <Textarea id={`reason-${kind}`} name="reason" rows={2} maxLength={1000} />
        </Field>
      )}
      <SubmitButton variant={kind === "delete" ? "danger" : "secondary"}>{label}</SubmitButton>
    </form>
  );
}
