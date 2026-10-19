import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { withAdmin } from "@/lib/admin";
import { lookups } from "@/lib/admin/lookups";
import {
  deleteProductAction, deleteSupplierLinkAction, deleteVariantAction, saveSupplierLinkAction, saveVariantAction,
} from "@/lib/actions/admin/catalog";
import { expectedMargin, effectiveUnitPrice } from "@/lib/pricing";
import { formatMoney, fromMills } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Card } from "@/components/admin/ui";
import { ProductForm, type ProductRow } from "@/components/admin/ProductForm";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Input, Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { Notice } from "@/components/ui/States";

export const metadata = { title: "تعديل منتج" };

type VariantRow = { id: string; color_name: string | null; color_hex: string | null; size: string | null; sku: string | null; price_override: string | null; availability: string };
type LinkRow = { id: string; supplier_id: string; supplier_name: string; agreement_status: string; variant_id: string | null; supplier_sku: string | null; supplier_url: string | null; cost: string; shipping_cost: string; currency_code: string; is_primary: boolean; notes: string | null };

const small = "h-9 py-1 text-sm";

function VariantFields({ v }: { v?: VariantRow }) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-6">
      <Input name="color_name" placeholder="اللون" defaultValue={v?.color_name ?? ""} className={small} aria-label="اسم اللون" />
      <input type="color" name="color_hex" defaultValue={v?.color_hex ?? "#c9b79c"} className="h-9 w-full cursor-pointer rounded border border-line bg-paper" aria-label="درجة اللون" />
      <Input name="size" placeholder="المقاس" defaultValue={v?.size ?? ""} className={small} aria-label="المقاس" dir="ltr" />
      <Input name="sku" placeholder="SKU" defaultValue={v?.sku ?? ""} className={small} aria-label="SKU" dir="ltr" />
      <Input name="price_override" placeholder="سعر خاص" defaultValue={v?.price_override ?? ""} className={small} aria-label="سعر خاص لهذا الخيار" dir="ltr" />
      <Select name="availability" defaultValue={v?.availability ?? "available"} className={small} aria-label="التوفر">
        {Object.keys(t.availability).map((k) => <option key={k} value={k}>{label(t.availability, k)}</option>)}
      </Select>
    </div>
  );
}

export default async function EditProduct({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await withAdmin(async (tx) => {
    const [product] = await tx.query<ProductRow>(
      `select id, slug, name_ar, name_en, description_ar, category_id, price::text, sale_price::text, currency_code, images,
              availability, status, origin_country, return_policy, delivery_overrides, is_featured, is_demo,
              processing_days, stock_confirmed_at::text
       from public.products where id = $1`,
      [id],
    );
    if (!product) return null;
    const variants = await tx.query<VariantRow>(
      "select id, color_name, color_hex, size, sku, price_override::text, availability from public.product_variants where product_id = $1 order by sort_order, color_name, size",
      [id],
    );
    const links = await tx.query<LinkRow>(
      `select sp.id, sp.supplier_id, s.name as supplier_name, s.agreement_status, sp.variant_id, sp.supplier_sku, sp.supplier_url, sp.cost::text,
              sp.shipping_cost::text, sp.currency_code, sp.is_primary, sp.notes
       from public.supplier_products sp join public.suppliers s on s.id = sp.supplier_id
       where sp.product_id = $1 order by sp.is_primary desc, s.name`,
      [id],
    );
    const [{ orders }] = await tx.query<{ orders: number }>("select count(distinct order_id)::int as orders from public.order_items where product_id = $1", [id]);
    return { product, variants, links, orders, ...(await lookups(tx)) };
  });
  if (!data) notFound();
  const { product: p, variants, links, suppliers, currencies, categories } = data;
  const sellPrice = effectiveUnitPrice({ price: p.price, salePrice: p.sale_price });
  const variantLabel = (vid: string | null) => {
    if (!vid) return "كل الخيارات";
    const v = variants.find((x) => x.id === vid);
    return v ? [v.color_name, v.size].filter(Boolean).join(" / ") : "خيار محذوف";
  };

  return (
    <div className="space-y-6">
      <AdminTitle
        title={p.name_ar}
        description={<span className="flex flex-wrap items-center gap-2"><Badge>{label(t.productStatus, p.status)}</Badge>{p.is_demo && <Badge tone="warning">منتج تجريبي</Badge>}<span>{data.orders} طلب يتضمن هذا المنتج</span></span>}
        action={p.status === "published" ? <Link href={`/product/${p.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm text-beige-deep hover:underline">عرض في المتجر <ExternalLink className="size-3.5" /></Link> : undefined}
      />
      {sp.created && <Notice tone="success">تم إنشاء المنتج. أضف الخيارات وبيانات المورد ثم انشره.</Notice>}

      <Card title="بيانات المنتج">
        <ProductForm product={p} categories={categories} currencies={currencies} />
      </Card>

      <Card title={`الخيارات: الألوان والمقاسات (${variants.length})`}>
        <p className="mb-4 text-xs leading-6 text-muted">إذا كان للمنتج خيارات فيجب على العميل اختيار واحد منها. التوفر هنا حالة فقط — لا نتتبع كميات مخزون لأن البيع يتم عبر الموردين.</p>
        <ul className="space-y-2">
          {variants.map((v) => (
            <li key={v.id} className="flex flex-col gap-2 rounded-md border border-line p-2 lg:flex-row lg:items-center">
              <ActionForm action={saveVariantAction} submitLabel="حفظ" size="sm" variant="secondary" className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="product_id" value={p.id} />
                <VariantFields v={v} />
              </ActionForm>
              <ActionForm action={deleteVariantAction} submitLabel="حذف" size="sm" variant="ghost" confirm="حذف هذا الخيار؟" className="">
                <input type="hidden" name="id" value={v.id} />
              </ActionForm>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-md border border-dashed border-line p-3">
          <p className="mb-2 text-sm font-semibold">إضافة خيار</p>
          <ActionForm action={saveVariantAction} submitLabel="إضافة" size="sm" resetOnSuccess className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <input type="hidden" name="product_id" value={p.id} />
            <VariantFields />
          </ActionForm>
        </div>
      </Card>

      <Card title="الموردون والتكاليف (داخلي — لا يظهر للعملاء)">
        {links.length === 0 && <Notice tone="warning">لا يوجد مورد مرتبط. لن يُحسب الربح المتوقع، ولن يُتاح الدفع عند الاستلام لهذا المنتج.</Notice>}
        <ul className="mt-3 space-y-3">
          {links.map((l) => {
            const margin = expectedMargin({ price: sellPrice, priceCurrency: p.currency_code, cost: l.cost, shippingCost: l.shipping_cost, costCurrency: l.currency_code });
            return (
              <li key={l.id} className="rounded-md border border-line p-3">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <strong>{l.supplier_name}</strong>
                  {l.is_primary && <Badge tone="dark">أساسي</Badge>}
                  <Badge tone={l.agreement_status === "approved" ? "success" : "warning"}>{label(t.supplierStatus, l.agreement_status)}</Badge>
                  <span className="text-muted">· {variantLabel(l.variant_id)}</span>
                  {l.supplier_url && <a href={l.supplier_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-beige-deep hover:underline">رابط المورد <ExternalLink className="size-3" /></a>}
                  <span className="ms-auto">
                    الهامش المتوقع للوحدة:{" "}
                    {margin === null ? (
                      <span className="text-warning">غير محسوب (عملة التكلفة {l.currency_code} ≠ عملة البيع {p.currency_code})</span>
                    ) : (
                      <strong className={margin >= 0 ? "text-success" : "text-danger"}>
                        {formatMoney(fromMills(margin), p.currency_code)} ({Number(sellPrice) > 0 ? Math.round((margin / 1000 / Number(sellPrice)) * 100) : 0}%)
                      </strong>
                    )}
                  </span>
                </div>
                <SupplierLinkForm productId={p.id} link={l} suppliers={suppliers} currencies={currencies} variants={variants} />
                <ActionForm action={deleteSupplierLinkAction} submitLabel="إزالة الربط" size="sm" variant="ghost" confirm="إزالة ربط هذا المورد؟" className="mt-2">
                  <input type="hidden" name="id" value={l.id} />
                </ActionForm>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 rounded-md border border-dashed border-line p-3">
          <p className="mb-2 text-sm font-semibold">ربط مورد</p>
          {suppliers.length === 0 ? (
            <p className="text-sm text-muted">أضف موردًا أولًا من <Link href="/admin/suppliers/new" className="underline">صفحة الموردين</Link>.</p>
          ) : (
            <SupplierLinkForm productId={p.id} suppliers={suppliers} currencies={currencies} variants={variants} defaultCurrency={p.currency_code} />
          )}
        </div>
      </Card>

      <Card title="منطقة الخطر">
        <p className="mb-3 text-sm text-muted">بدل الحذف يمكنك تغيير الحالة إلى «مخفي». الحذف نهائي، والطلبات السابقة تحتفظ بنسخة من اسم المنتج وسعره.</p>
        <ActionForm action={deleteProductAction} submitLabel="حذف المنتج نهائيًا" variant="danger" confirm="سيتم حذف المنتج نهائيًا. متابعة؟">
          <input type="hidden" name="id" value={p.id} />
        </ActionForm>
      </Card>
    </div>
  );
}

function SupplierLinkForm({
  productId, link, suppliers, currencies, variants, defaultCurrency,
}: {
  productId: string;
  link?: LinkRow;
  suppliers: { id: string; name: string }[];
  currencies: { code: string; name_ar: string }[];
  variants: VariantRow[];
  defaultCurrency?: string;
}) {
  return (
    <ActionForm action={saveSupplierLinkAction} submitLabel={link ? "حفظ" : "ربط المورد"} size="sm" variant={link ? "secondary" : "primary"} resetOnSuccess={!link} className="space-y-2">
      {link && <input type="hidden" name="id" value={link.id} />}
      <input type="hidden" name="product_id" value={productId} />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Select name="supplier_id" defaultValue={link?.supplier_id ?? ""} className={small} aria-label="المورد" required>
          <option value="">اختر المورد</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Select name="variant_id" defaultValue={link?.variant_id ?? ""} className={small} aria-label="الخيار">
          <option value="">كل الخيارات</option>
          {variants.map((v) => <option key={v.id} value={v.id}>{[v.color_name, v.size].filter(Boolean).join(" / ")}</option>)}
        </Select>
        <Input name="supplier_sku" placeholder="SKU لدى المورد" defaultValue={link?.supplier_sku ?? ""} className={small} dir="ltr" aria-label="SKU لدى المورد" />
        <Input name="supplier_url" placeholder="https://رابط المنتج لدى المورد" defaultValue={link?.supplier_url ?? ""} className={small} dir="ltr" aria-label="رابط المنتج لدى المورد" />
        <Input name="cost" placeholder="تكلفة المورد" defaultValue={link?.cost ?? ""} className={small} dir="ltr" aria-label="تكلفة المورد للوحدة" required />
        <Input name="shipping_cost" placeholder="رسوم إضافية للقطعة (تغليف…)" defaultValue={link?.shipping_cost ?? ""} className={small} dir="ltr" aria-label="رسوم إضافية يتقاضاها المورد للقطعة — تكلفة التوصيل تُسجل لكل طلب" />
        <Select name="currency_code" defaultValue={link?.currency_code ?? defaultCurrency ?? "ILS"} className={small} aria-label="عملة التكلفة">
          {currencies.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
        </Select>
        <Input name="notes" placeholder="ملاحظات" defaultValue={link?.notes ?? ""} className={small} aria-label="ملاحظات" />
      </div>
      <Checkbox name="is_primary" defaultChecked={link ? link.is_primary : true} label="المورد الأساسي (يُستخدم لتسجيل التكلفة عند الطلب)" />
    </ActionForm>
  );
}
