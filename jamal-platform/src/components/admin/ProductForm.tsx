import { saveProductAction } from "@/lib/actions/admin/catalog";
import { label, t } from "@/lib/i18n/ar";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { formatDate } from "@/components/orders/OrderParts";

export type ProductRow = {
  id: string; slug: string; name_ar: string; name_en: string | null; description_ar: string | null; category_id: string | null;
  price: string; sale_price: string | null; currency_code: string; images: { url: string; alt?: string }[]; availability: string;
  status: string; origin_country: string | null; return_policy: string | null; delivery_overrides: Record<string, { min: number; max: number }>;
  is_featured: boolean; is_demo: boolean; processing_days: number | null; stock_confirmed_at: string | null;
};

export function ProductForm({
  product,
  categories,
  currencies,
}: {
  product?: ProductRow;
  categories: { id: string; name_ar: string }[];
  currencies: { code: string; name_ar: string; is_active: boolean }[];
}) {
  const p = product;
  return (
    <ActionForm action={saveProductAction} submitLabel={p ? "حفظ التغييرات" : "إنشاء المنتج"} className="space-y-6">
      {p && <input type="hidden" name="id" value={p.id} />}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="الاسم بالعربية *" htmlFor="name_ar"><Input id="name_ar" name="name_ar" required defaultValue={p?.name_ar} /></Field>
        <Field label="الاسم بالإنجليزية" htmlFor="name_en"><Input id="name_en" name="name_en" dir="ltr" defaultValue={p?.name_en ?? ""} /></Field>
        <Field label="المعرّف في الرابط (slug) *" htmlFor="slug" hint="أحرف إنجليزية صغيرة وأرقام وشرطات، مثل linen-dress">
          <Input id="slug" name="slug" dir="ltr" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={p?.slug} />
        </Field>
        <Field label="الفئة" htmlFor="category_id">
          <Select id="category_id" name="category_id" defaultValue={p?.category_id ?? ""}>
            <option value="">بدون فئة</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="الوصف" htmlFor="description_ar"><Textarea id="description_ar" name="description_ar" rows={5} defaultValue={p?.description_ar ?? ""} /></Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="السعر *" htmlFor="price"><Input id="price" name="price" inputMode="decimal" dir="ltr" required defaultValue={p?.price ?? ""} /></Field>
        <Field label="سعر التخفيض" htmlFor="sale_price" hint="اتركه فارغًا إن لم يوجد تخفيض"><Input id="sale_price" name="sale_price" inputMode="decimal" dir="ltr" defaultValue={p?.sale_price ?? ""} /></Field>
        <Field label="العملة *" htmlFor="currency_code" hint="لا يتم أي تحويل بين العملات">
          <Select id="currency_code" name="currency_code" defaultValue={p?.currency_code ?? "ILS"}>
            {currencies.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name_ar}{c.is_active ? "" : " (غير مفعّلة)"}</option>)}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="حالة النشر" htmlFor="status">
          <Select id="status" name="status" defaultValue={p?.status ?? "draft"}>
            {Object.entries(t.productStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="التوفر" htmlFor="availability">
          <Select id="availability" name="availability" defaultValue={p?.availability ?? "available"}>
            {Object.keys(t.availability).map((k) => <option key={k} value={k}>{label(t.availability, k)}</option>)}
          </Select>
        </Field>
        <Field label="بلد المنشأ (بعد التحقق فقط)" htmlFor="origin_country"><Input id="origin_country" name="origin_country" defaultValue={p?.origin_country ?? ""} /></Field>
      </div>
      <Field label="الصور (رابط في كل سطر، ويمكن إضافة وصف بعد |)" htmlFor="images" hint="مثال: https://…/photo.jpg | فستان بيج — استخدم صورًا تملك حق استخدامها فقط.">
        <Textarea id="images" name="images" dir="ltr" rows={4} defaultValue={(p?.images ?? []).map((i) => (i.alt ? `${i.url} | ${i.alt}` : i.url)).join("\n")} />
      </Field>
      <Field label="رفع صور جديدة" htmlFor="upload" hint="JPG / PNG / WEBP / AVIF — المجموع حتى 4MB في كل حفظ. تُضاف إلى القائمة أعلاه.">
        <input id="upload" name="upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="block w-full text-sm file:me-3 file:rounded file:border-0 file:bg-sand file:px-3 file:py-2" />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="سياسة الاستبدال الخاصة بالمنتج" htmlFor="return_policy" hint="اتركها فارغة لتطبيق السياسة العامة">
          <Textarea id="return_policy" name="return_policy" rows={3} defaultValue={p?.return_policy ?? ""} />
        </Field>
        <Field label="مدة توصيل خاصة حسب الدولة" htmlFor="delivery_overrides" hint="سطر لكل دولة: SA: 5-9 (أيام). تُضاف فوق مدة منطقة الشحن إن كانت أطول.">
          <Textarea id="delivery_overrides" name="delivery_overrides" dir="ltr" rows={3} defaultValue={Object.entries(p?.delivery_overrides ?? {}).map(([k, v]) => `${k}: ${v.min}-${v.max}`).join("\n")} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="مدة التجهيز لدى المورد (أيام)"><Input name="processing_days" type="number" min={0} max={60} defaultValue={p?.processing_days ?? ""} /></Field>
        <div className="space-y-2 rounded-md border border-line p-3 text-sm">
          <p className="text-muted">آخر تأكيد للتوفر والسعر مع المورد: <strong className="text-ink">{p?.stock_confirmed_at ? formatDate(p.stock_confirmed_at) : "لم يُؤكد"}</strong></p>
          <Checkbox name="confirm_stock" label="أكدت اليوم مع المورد التوفر والسعر" />
          <p className="text-xs text-muted">التوفر يُحدَّث يدويًا (لا ربط آلي بمخزون المورد)، ويُؤكد مرة أخرى لكل طلب قبل طلب الدفع.</p>
        </div>
      </div>
      <p className="text-xs text-muted">النشر يتطلب ربط المنتج بمورد أساسي «معتمد» من قسم الموردين والتكاليف أدناه.</p>
      <Checkbox name="is_featured" defaultChecked={p?.is_featured} label="عرضه ضمن «مختارات JAMAL» في الرئيسية" />
    </ActionForm>
  );
}
