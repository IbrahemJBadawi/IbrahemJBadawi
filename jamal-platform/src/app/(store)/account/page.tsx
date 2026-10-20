import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { updateProfileAction } from "@/lib/actions/account";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, Input } from "@/components/ui/Field";

export const metadata: Metadata = { title: "حسابي", robots: { index: false } };

export const instant = false;

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-2xl font-bold">أهلًا {user.fullName ?? ""}</h1>
      <p className="mb-8 text-sm text-muted ltr text-end">{user.email}</p>
      <ActionForm action={updateProfileAction} submitLabel="حفظ البيانات">
        <Field label="الاسم الكامل" htmlFor="fullName">
          <Input id="fullName" name="fullName" defaultValue={user.fullName ?? ""} required autoComplete="name" />
        </Field>
        <Field label="رقم الهاتف" htmlFor="phone" hint="يُستخدم لتعبئة نموذج الطلب تلقائيًا">
          <Input id="phone" name="phone" type="tel" dir="ltr" className="text-end" defaultValue={user.phone ?? ""} autoComplete="tel" />
        </Field>
      </ActionForm>
    </div>
  );
}
