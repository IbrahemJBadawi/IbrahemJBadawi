import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import type { SupplierAccount } from "@/lib/suppliers/portal";

/** Business details shared by the sign-up and the profile pages. */
export function SupplierProfileFields({ s, governorates, withName = false }: { s?: SupplierAccount | null; governorates: { id: string; name_ar: string }[]; withName?: boolean }) {
  return (
    <div className="space-y-4">
      {withName && <Field label="اسم المتجر أو النشاط"><Input name="name" required maxLength={120} placeholder="مثال: بوتيك ريم" /></Field>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم المسؤول"><Input name="contactName" required defaultValue={s?.contact_name ?? ""} autoComplete="name" /></Field>
        <Field label="رقم الهاتف"><Input name="phone" type="tel" dir="ltr" className="text-end" required defaultValue={s?.phone ?? ""} autoComplete="tel" /></Field>
        <Field label="واتساب (اختياري)"><Input name="whatsapp" type="tel" dir="ltr" className="text-end" defaultValue={s?.whatsapp ?? ""} /></Field>
        <Field label="البريد (اختياري)"><Input name="email" type="email" dir="ltr" className="text-end" defaultValue={s?.email ?? ""} /></Field>
        <Field label="المحافظة">
          <Select name="governorateId" defaultValue={s?.governorate_id ?? ""}>
            <option value="">اختر</option>
            {governorates.map((g) => <option key={g.id} value={g.id}>{g.name_ar}</option>)}
          </Select>
        </Field>
        <Field label="المدينة / البلدة"><Input name="city" required defaultValue={s?.city ?? ""} /></Field>
      </div>
      <Field label="ماذا توفّر؟" hint="مثال: عبايات، فساتين سهرة، أحذية نسائية"><Input name="categories" required maxLength={300} defaultValue={s?.categories_supplied ?? ""} /></Field>
      <Field label="ملاحظات (اختياري)" hint="مدة التجهيز المعتادة، سياسة الاستبدال لديك، أي شيء يهمنا معرفته"><Textarea name="notes" rows={3} defaultValue={s?.notes ?? ""} /></Field>
    </div>
  );
}
