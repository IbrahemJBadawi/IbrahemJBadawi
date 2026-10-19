import { saveSupplierAction } from "@/lib/actions/admin/operations";
import { t } from "@/lib/i18n/ar";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { formatDate } from "@/components/orders/OrderParts";

export type SupplierRow = {
  id: string; name: string; contact_name: string | null; email: string | null; phone: string | null; whatsapp: string | null;
  social_links: string | null; website: string | null; country_code: string | null; coverage_areas: string | null; categories_supplied: string | null;
  ships_to: string[]; cod_countries: string[]; processing_days: number; delivery_days: number | null; return_policy: string | null;
  min_order: string | null; accepts_single_item: boolean | null; accepts_dropship: boolean | null; accepts_pay_after_collection: boolean | null;
  accepts_cod: boolean | null; collection_party: string | null; settlement_method: string | null; agreement_status: string;
  terms_confirmed_at: string | null; prices_confirmed_at: string | null; notes: string | null; is_active: boolean;
};

export const SUPPLIER_SELECT = `id, name, contact_name, email, phone, whatsapp, social_links, website, country_code, coverage_areas, categories_supplied,
  ships_to, cod_countries, processing_days, delivery_days, return_policy, min_order, accepts_single_item, accepts_dropship,
  accepts_pay_after_collection, accepts_cod, collection_party, settlement_method, agreement_status, terms_confirmed_at::text,
  prices_confirmed_at::text, notes, is_active`;

function Tri({ name, label, value }: { name: string; label: string; value: boolean | null | undefined }) {
  return (
    <Field label={label}>
      <Select name={name} defaultValue={value === true ? "yes" : value === false ? "no" : ""}>
        <option value="">لم يتم التأكيد</option>
        <option value="yes">نعم — أكده المورد</option>
        <option value="no">لا</option>
      </Select>
    </Field>
  );
}

export function SupplierForm({ s }: { s?: SupplierRow }) {
  return (
    <ActionForm action={saveSupplierAction} submitLabel={s ? "حفظ" : "إضافة المورد"} className="space-y-6">
      {s && <input type="hidden" name="id" value={s.id} />}
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-sm font-bold">البيانات والتواصل</legend>
        <Field label="الاسم التجاري *"><Input name="name" required defaultValue={s?.name} /></Field>
        <Field label="اسم جهة الاتصال"><Input name="contact_name" defaultValue={s?.contact_name ?? ""} /></Field>
        <Field label="الهاتف"><Input name="phone" dir="ltr" defaultValue={s?.phone ?? ""} /></Field>
        <Field label="واتساب"><Input name="whatsapp" dir="ltr" defaultValue={s?.whatsapp ?? ""} /></Field>
        <Field label="البريد الإلكتروني"><Input name="email" type="email" dir="ltr" defaultValue={s?.email ?? ""} /></Field>
        <Field label="وسائل تواصل أخرى (روابط)"><Input name="social_links" dir="ltr" defaultValue={s?.social_links ?? ""} /></Field>
        <Field label="الموقع الإلكتروني"><Input name="website" dir="ltr" defaultValue={s?.website ?? ""} placeholder="https://" /></Field>
        <Field label="دولة المورد (رمز)"><Input name="country_code" dir="ltr" maxLength={2} defaultValue={s?.country_code ?? "PS"} /></Field>
        <Field label="المناطق التي يغطيها"><Input name="coverage_areas" defaultValue={s?.coverage_areas ?? ""} placeholder="مثل: رام الله، نابلس، الخليل" /></Field>
        <Field label="الفئات التي يوفرها"><Input name="categories_supplied" defaultValue={s?.categories_supplied ?? ""} placeholder="مثل: ملابس نسائية يومية" /></Field>
        <Field label="يشحن إلى (رموز الدول)"><Input name="ships_to" dir="ltr" defaultValue={s?.ships_to.join(" ") ?? "PS"} /></Field>
      </fieldset>

      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-2 text-sm font-bold">شروط الاتفاق (لا تُفترض — سجّل فقط ما أكده المورد)</legend>
        <Tri name="accepts_single_item" label="يقبل تنفيذ قطعة واحدة" value={s?.accepts_single_item} />
        <Tri name="accepts_dropship" label="يقبل الشحن المباشر للعميل" value={s?.accepts_dropship} />
        <Tri name="accepts_pay_after_collection" label="يقبل الدفع بعد تأكيد التحصيل" value={s?.accepts_pay_after_collection} />
        <Tri name="accepts_cod" label="يقبل التحصيل عند الاستلام (مستقبلًا)" value={s?.accepts_cod} />
        <Field label="جهة التحصيل من العميل">
          <Select name="collection_party" defaultValue={s?.collection_party ?? ""}>
            <option value="">لم تُحدد</option><option value="platform">المنصة (تحويل بنكي)</option><option value="supplier">المورد</option><option value="courier">شركة التوصيل</option>
          </Select>
        </Field>
        <Field label="طريقة تسوية مستحقاته"><Input name="settlement_method" defaultValue={s?.settlement_method ?? ""} placeholder="مثل: تحويل بنكي خلال 24 ساعة من التحصيل" /></Field>
        <Field label="الحد الأدنى للطلب"><Input name="min_order" defaultValue={s?.min_order ?? ""} /></Field>
        <Field label="مدة التجهيز (أيام)"><Input name="processing_days" type="number" min={0} defaultValue={s?.processing_days ?? 2} /></Field>
        <Field label="مدة التوصيل (أيام)"><Input name="delivery_days" type="number" min={0} defaultValue={s?.delivery_days ?? ""} /></Field>
        <Field label="الدفع عند الاستلام متاح في (رموز الدول)"><Input name="cod_countries" dir="ltr" defaultValue={s?.cod_countries.join(" ") ?? ""} /></Field>
      </fieldset>
      <Field label="سياسة الاستبدال والإرجاع لدى المورد"><Textarea name="return_policy" rows={2} defaultValue={s?.return_policy ?? ""} /></Field>

      <fieldset className="space-y-3 rounded-md border border-line p-4">
        <legend className="px-1 text-sm font-bold">حالة الاتفاق</legend>
        <Field label="الحالة" hint="منتجات المورد غير المعتمد لا يمكن نشرها، وإيقاف المورد يخفي منتجاته تلقائيًا.">
          <Select name="agreement_status" defaultValue={s?.agreement_status ?? "contacting"}>
            {Object.entries(t.supplierStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Checkbox name="confirm_terms" label={<>أؤكد أن المورد وافق فعليًا على شروط المنصة (يُسجّل باسمي والتاريخ){s?.terms_confirmed_at && <span className="text-xs text-muted"> — آخر تأكيد {formatDate(s.terms_confirmed_at)}</span>}</>} />
        <Checkbox name="confirm_prices" label={<>أكدت مع المورد اليوم الأسعار والمخزون{s?.prices_confirmed_at && <span className="text-xs text-muted"> — آخر تأكيد {formatDate(s.prices_confirmed_at)}</span>}</>} />
        <Checkbox name="is_active" defaultChecked={s ? s.is_active : true} label="مورد نشط" />
      </fieldset>
      <Field label="ملاحظات داخلية"><Textarea name="notes" rows={3} defaultValue={s?.notes ?? ""} /></Field>
    </ActionForm>
  );
}
