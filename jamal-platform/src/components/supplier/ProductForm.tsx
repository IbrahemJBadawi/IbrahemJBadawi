import { saveSupplierProductAction } from "@/lib/actions/supplier";
import { ActionForm } from "@/components/forms/ActionForm";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";

type Existing = {
  id: string; name_ar: string; description_ar: string | null; category_id: string | null; price: string; cost: string;
  status: string; availability: string; processing_days: number | null; images: { url: string; alt?: string }[];
  variants: { color_name: string | null; color_hex: string | null; size: string | null }[];
};

/** Add / edit a product. Live products only accept stock and price-to-us changes. */
export function SupplierProductForm({ p, categories }: { p?: Existing | null; categories: { id: string; name_ar: string }[] }) {
  const live = p?.status === "published";
  const sizes = p ? [...new Set(p.variants.map((v) => v.size).filter(Boolean))].join("، ") : "";
  const colors = p
    ? [...new Map(p.variants.filter((v) => v.color_name).map((v) => [v.color_name, `${v.color_name}${v.color_hex ? ` ${v.color_hex}` : ""}`])).values()].join("\n")
    : "";
  return (
    <ActionForm action={saveSupplierProductAction} submitLabel={p ? (live ? "حفظ" : "حفظ وإرسال للمراجعة") : "إرسال المنتج للمراجعة"} pendingLabel="جارٍ الحفظ…" className="space-y-5">
      {p && <input type="hidden" name="id" value={p.id} />}
      <fieldset disabled={live} className="space-y-5 disabled:opacity-60">
        <Field label="اسم المنتج"><Input name="name" required maxLength={160} defaultValue={p?.name_ar ?? ""} placeholder="مثال: عباية كريب بأكمام واسعة" /></Field>
        <Field label="الوصف" hint="القماش، القصة، المقاسات، تعليمات الغسيل"><Textarea name="description" rows={4} defaultValue={p?.description_ar ?? ""} /></Field>
        <Field label="القسم">
          <Select name="categoryId" defaultValue={p?.category_id ?? ""}>
            <option value="">اختر القسم</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="المقاسات" hint="افصل بفاصلة: S، M، L أو 52، 54"><Input name="sizes" defaultValue={sizes} /></Field>
          <Field label="الألوان" hint="لون في كل سطر، ويمكن إضافة الرمز: أسود #111111"><Textarea name="colors" rows={2} defaultValue={colors} /></Field>
        </div>
      </fieldset>
      {live && <input type="hidden" name="name" value={p!.name_ar} />}
      {live && <input type="hidden" name="description" value={p!.description_ar ?? ""} />}
      {live && <input type="hidden" name="categoryId" value={p!.category_id ?? ""} />}
      {live && <input type="hidden" name="suggestedPrice" value={p!.price} />}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="سعرك للمنصة (₪)" hint="ما تستلمه أنت عن القطعة"><Input name="cost" inputMode="decimal" dir="ltr" className="text-end" required defaultValue={p?.cost ?? ""} /></Field>
        {!live && <Field label="سعر البيع المقترح (₪)" hint="القرار النهائي للمنصة"><Input name="suggestedPrice" inputMode="decimal" dir="ltr" className="text-end" required defaultValue={p?.price ?? ""} /></Field>}
        <Field label="مدة التجهيز (أيام)"><Input name="processingDays" type="number" min={0} max={30} defaultValue={p?.processing_days ?? 2} /></Field>
      </div>
      <Field label="التوفر">
        <Select name="availability" defaultValue={p?.availability === "out_of_stock" ? "out_of_stock" : "available"}>
          <option value="available">متوفر</option>
          <option value="out_of_stock">نفد حاليًا</option>
        </Select>
      </Field>
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-bold">الصور</legend>
        {!!p?.images.length && (
          <ul className="flex flex-wrap gap-3">
            {p.images.map((img) => (
              <li key={img.url}>
                <label className="block w-20 text-center text-[0.68rem] text-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded thumbnails of any host */}
                  <img src={img.url} alt="" className="mb-1 aspect-[3/4] w-20 rounded-xl object-cover" />
                  <input type="checkbox" name="keepImage" value={img.url} defaultChecked disabled={live} className="accent-ink" /> إبقاء
                  {live && <input type="hidden" name="keepImage" value={img.url} />}
                </label>
              </li>
            ))}
          </ul>
        )}
        {!live && (
          <Field label="أضف صورًا" hint="حتى 8 صور، JPG أو PNG أو WEBP، كل صورة حتى 4MB. صور واضحة على خلفية فاتحة تبيع أكثر.">
            <Input name="upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple />
          </Field>
        )}
      </fieldset>
      {live && <p className="text-xs leading-6 text-muted">المنتج منشور: يمكنك تحديث سعرك والتوفر. لتعديل الصور أو الوصف راسل فريق المنصة.</p>}
    </ActionForm>
  );
}
