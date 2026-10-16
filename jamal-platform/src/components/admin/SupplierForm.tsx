import { saveSupplierAction } from "@/lib/actions/admin/operations";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/Field";

export type SupplierRow = {
  id: string; name: string; contact_name: string | null; email: string | null; phone: string | null; whatsapp: string | null;
  website: string | null; country_code: string | null; ships_to: string[]; cod_countries: string[]; processing_days: number; notes: string | null; is_active: boolean;
};

export function SupplierForm({ s }: { s?: SupplierRow }) {
  return (
    <ActionForm action={saveSupplierAction} submitLabel={s ? "حفظ" : "إضافة المورد"} className="space-y-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="اسم المورد *"><Input name="name" required defaultValue={s?.name} /></Field>
        <Field label="جهة الاتصال"><Input name="contact_name" defaultValue={s?.contact_name ?? ""} /></Field>
        <Field label="دولة المورد (رمز من حرفين)"><Input name="country_code" dir="ltr" maxLength={2} defaultValue={s?.country_code ?? ""} placeholder="TR" /></Field>
        <Field label="البريد الإلكتروني"><Input name="email" type="email" dir="ltr" defaultValue={s?.email ?? ""} /></Field>
        <Field label="الهاتف"><Input name="phone" dir="ltr" defaultValue={s?.phone ?? ""} /></Field>
        <Field label="واتساب"><Input name="whatsapp" dir="ltr" defaultValue={s?.whatsapp ?? ""} /></Field>
        <Field label="الموقع الإلكتروني"><Input name="website" dir="ltr" defaultValue={s?.website ?? ""} placeholder="https://" /></Field>
        <Field label="يشحن إلى (رموز الدول)" hint="مثال: SA AE JO — اتركه فارغًا إن لم يتم التحقق"><Input name="ships_to" dir="ltr" defaultValue={s?.ships_to.join(" ") ?? ""} /></Field>
        <Field label="الدفع عند الاستلام متاح في" hint="فقط الدول التي أكدها المورد كتابيًا"><Input name="cod_countries" dir="ltr" defaultValue={s?.cod_countries.join(" ") ?? ""} /></Field>
        <Field label="مدة التجهيز (أيام)"><Input name="processing_days" type="number" min={0} defaultValue={s?.processing_days ?? 2} /></Field>
      </div>
      <Field label="ملاحظات داخلية (شروط، أسعار شحن، طريقة الطلب…)"><Textarea name="notes" rows={3} defaultValue={s?.notes ?? ""} /></Field>
      <Checkbox name="is_active" defaultChecked={s ? s.is_active : true} label="مورد نشط" />
    </ActionForm>
  );
}
