import { withAdmin } from "@/lib/admin";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions/admin/catalog";
import { AdminTitle, Card, Details } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Input } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "الفئات" };

type Cat = { id: string; slug: string; name_ar: string; name_en: string | null; description_ar: string | null; image_url: string | null; sort_order: number; is_active: boolean; products: number };

function CategoryFields({ c }: { c?: Cat }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <Field label="الاسم بالعربية"><Input name="name_ar" required defaultValue={c?.name_ar} /></Field>
      <Field label="الاسم بالإنجليزية"><Input name="name_en" dir="ltr" defaultValue={c?.name_en ?? ""} /></Field>
      <Field label="المعرّف (slug)"><Input name="slug" dir="ltr" required defaultValue={c?.slug} /></Field>
      <Field label="الوصف" className="md:col-span-2"><Input name="description_ar" defaultValue={c?.description_ar ?? ""} /></Field>
      <Field label="الترتيب"><Input name="sort_order" type="number" min={0} defaultValue={c?.sort_order ?? 0} /></Field>
      <Field label="رابط صورة الغلاف (اختياري)" className="md:col-span-2"><Input name="image_url" dir="ltr" defaultValue={c?.image_url ?? ""} placeholder="https://" /></Field>
      <div className="flex items-end pb-2"><Checkbox name="is_active" defaultChecked={c ? c.is_active : true} label="مفعّلة وظاهرة في المتجر" /></div>
    </div>
  );
}

export default async function AdminCategories() {
  const cats = await withAdmin((tx) =>
    tx.query<Cat>(
      `select c.id, c.slug, c.name_ar, c.name_en, c.description_ar, c.image_url, c.sort_order, c.is_active,
              (select count(*)::int from public.products p where p.category_id = c.id) as products
       from public.categories c order by c.sort_order, c.name_ar`,
    ),
  );
  return (
    <div className="space-y-6">
      <AdminTitle title="الفئات" description="«العروض والتخفيضات» صفحة تلقائية تعرض كل منتج له سعر تخفيض، ولا تحتاج فئة." />
      <div className="space-y-2">
        {cats.map((c) => (
          <Details key={c.id} summary={<span className="inline-flex flex-wrap items-center gap-2">{c.name_ar} <span className="ltr text-xs text-muted">/{c.slug}</span> <Badge>{c.products} منتج</Badge> {!c.is_active && <Badge tone="outline">مخفية</Badge>}</span>}>
            <ActionForm action={saveCategoryAction} submitLabel="حفظ" className="space-y-4">
              <input type="hidden" name="id" value={c.id} />
              <CategoryFields c={c} />
            </ActionForm>
            <ActionForm action={deleteCategoryAction} submitLabel="حذف الفئة" variant="ghost" size="sm" confirm={`حذف «${c.name_ar}»؟ ستصبح منتجاتها بدون فئة.`} className="mt-3">
              <input type="hidden" name="id" value={c.id} />
            </ActionForm>
          </Details>
        ))}
      </div>
      <Card title="إضافة فئة">
        <ActionForm action={saveCategoryAction} submitLabel="إضافة" resetOnSuccess className="space-y-4">
          <CategoryFields />
        </ActionForm>
      </Card>
    </div>
  );
}
