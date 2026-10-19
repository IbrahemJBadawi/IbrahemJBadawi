"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { RELATIONSHIP } from "@/lib/labels";
import { redeemLinkCodeAction } from "../profile/parent-link-actions";

export function RedeemForm() {
  const [state, action] = useActionState(redeemLinkCodeAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3 sm:items-end">
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
      <Field label="رمز الربط" name="code" hint="10 خانات يحصل عليها ابنك من صفحة حسابه">
        <Input name="code" autoComplete="off" autoCapitalize="characters" dir="ltr" maxLength={10} required className="font-mono tracking-widest" />
      </Field>
      <Field label="صلة القرابة" name="relationship">
        <Select name="relationship" defaultValue="father">
          {Object.entries(RELATIONSHIP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </Field>
      <SubmitButton>ربط</SubmitButton>
    </form>
  );
}
