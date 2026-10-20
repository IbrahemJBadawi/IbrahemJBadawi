"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { audit, withAdmin } from "@/lib/admin";
import { currency, dbError, f, fieldErrors, money, optMoney, optUrl, slug } from "@/lib/admin/form";
import { uploadImage } from "@/lib/storage";
import type { ActionResult } from "@/components/forms/ActionForm";

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const productSchema = z
  .object({
    name_ar: z.string().trim().min(2, "الاسم العربي مطلوب").max(160),
    name_en: z.string().trim().max(160).transform((v) => v || null),
    slug,
    category_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
    description_ar: z.string().trim().max(5000).transform((v) => v || null),
    price: money,
    sale_price: optMoney,
    currency_code: currency,
    availability: z.enum(["available", "out_of_stock", "discontinued"]),
    status: z.enum(["draft", "published", "hidden"]),
    origin_country: z.string().trim().max(60).transform((v) => v || null),
    return_policy: z.string().trim().max(2000).transform((v) => v || null),
    is_featured: z.boolean(),
    processing_days: z.union([z.literal(""), z.coerce.number().int().min(0).max(60)]).transform((v) => (v === "" ? null : v)),
  })
  .refine((d) => d.sale_price === null || Number(d.sale_price) < Number(d.price), {
    message: "سعر التخفيض يجب أن يكون أقل من السعر الأصلي",
    path: ["sale_price"],
  });

/** "url | alt" per line. */
function parseImages(text: string) {
  const images: { url: string; alt?: string }[] = [];
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const [url, alt] = line.split("|").map((s) => s.trim());
    if (!/^(https:\/\/|\/media\/|\/demo\/)/.test(url)) throw new Error(`رابط صورة غير مقبول: ${url} (يجب أن يبدأ بـ https://)`);
    images.push(alt ? { url, alt } : { url });
  }
  return images.slice(0, 12);
}

/** "SA: 5-9" per line → { SA: { min: 5, max: 9 } } */
function parseOverrides(text: string) {
  const out: Record<string, { min: number; max: number }> = {};
  for (const line of text.split("\n").map((l) => l.trim()).filter(Boolean)) {
    const m = /^([A-Za-z]{2})\s*[:：]\s*(\d{1,3})\s*[-–]\s*(\d{1,3})$/.exec(line);
    if (!m || Number(m[2]) > Number(m[3])) throw new Error(`صيغة مدة التوصيل غير صحيحة: «${line}» (مثال: SA: 5-9)`);
    out[m[1].toUpperCase()] = { min: Number(m[2]), max: Number(m[3]) };
  }
  return out;
}

export async function saveProductAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = f.opt(form, "id");
  const parsed = productSchema.safeParse({
    name_ar: f.str(form, "name_ar"),
    name_en: f.str(form, "name_en"),
    slug: f.str(form, "slug"),
    category_id: f.str(form, "category_id"),
    description_ar: f.str(form, "description_ar"),
    price: f.str(form, "price"),
    sale_price: f.str(form, "sale_price"),
    currency_code: f.str(form, "currency_code"),
    availability: f.str(form, "availability"),
    status: f.str(form, "status"),
    origin_country: f.str(form, "origin_country"),
    return_policy: f.str(form, "return_policy"),
    is_featured: f.bool(form, "is_featured"),
    processing_days: f.str(form, "processing_days"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const confirmStock = f.bool(form, "confirm_stock");

  let images: { url: string; alt?: string }[];
  let overrides: Record<string, { min: number; max: number }>;
  try {
    images = parseImages(f.str(form, "images"));
    overrides = parseOverrides(f.str(form, "delivery_overrides"));
  } catch (e) {
    return { error: (e as Error).message };
  }
  const files = form.getAll("upload").filter((x): x is File => x instanceof File && x.size > 0);
  for (const file of files.slice(0, 6)) {
    const up = await uploadImage(file);
    if (!up.ok) return { error: up.error };
    images.push({ url: up.url, alt: parsed.data.name_ar });
  }

  const d = parsed.data;
  const values = [
    d.name_ar, d.name_en, d.slug, d.category_id, d.description_ar, d.price, d.sale_price, d.currency_code,
    JSON.stringify(images), d.availability, d.status, d.origin_country, d.return_policy, JSON.stringify(overrides), d.is_featured,
    d.processing_days, confirmStock,
  ];
  let newId: string | null = null;
  try {
    await withAdmin(async (tx, admin) => {
      if (id) {
        const rows = await tx.query(
          `update public.products set name_ar=$1, name_en=$2, slug=$3, category_id=$4, description_ar=$5, price=$6, sale_price=$7,
             currency_code=$8, images=$9::text::jsonb, availability=$10, status=$11, origin_country=$12, return_policy=$13,
             delivery_overrides=$14::text::jsonb, is_featured=$15, processing_days=$16,
             stock_confirmed_at = case when $17::boolean then now() else stock_confirmed_at end
           where id = $18 returning id`,
          [...values, id],
        );
        if (!rows.length) throw new Error("not found");
        await audit(tx, admin, "update", "product", id, { status: d.status, price: d.price, sale_price: d.sale_price });
      } else {
        const [row] = await tx.query<{ id: string }>(
          `insert into public.products (name_ar, name_en, slug, category_id, description_ar, price, sale_price, currency_code,
             images, availability, status, origin_country, return_policy, delivery_overrides, is_featured, processing_days, stock_confirmed_at)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9::text::jsonb,$10,$11,$12,$13,$14::text::jsonb,$15,$16, case when $17::boolean then now() end) returning id`,
          values,
        );
        newId = row.id;
        await audit(tx, admin, "create", "product", row.id, { name: d.name_ar });
      }
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  if (newId) redirect(`/admin/products/${newId}?created=1`);
  refresh();
  return { ok: true, message: "تم حفظ المنتج." };
}

export async function deleteProductAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  if (!id.success) return { error: "معرّف غير صالح" };
  try {
    await withAdmin(async (tx, admin) => {
      const [p] = await tx.query<{ name_ar: string }>("delete from public.products where id = $1 returning name_ar", [id.data]);
      await audit(tx, admin, "delete", "product", id.data, { name: p?.name_ar });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  redirect("/admin/products");
}

/** Quick price edit used by the offers & pricing screen. */
export async function updatePricesAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const parsed = z
    .object({ id: z.uuid(), price: money, sale_price: optMoney })
    .refine((d) => d.sale_price === null || Number(d.sale_price) < Number(d.price), { message: "سعر التخفيض يجب أن يكون أقل من السعر", path: ["sale_price"] })
    .safeParse({ id: f.str(form, "id"), price: f.str(form, "price"), sale_price: f.str(form, "sale_price") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  try {
    await withAdmin(async (tx, admin) => {
      await tx.query("update public.products set price = $1, sale_price = $2 where id = $3", [parsed.data.price, parsed.data.sale_price, parsed.data.id]);
      await audit(tx, admin, "update_price", "product", parsed.data.id, { price: parsed.data.price, sale_price: parsed.data.sale_price });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true, message: "تم التحديث." };
}

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const variantSchema = z.object({
  product_id: z.uuid(),
  color_name: z.string().trim().max(40).transform((v) => v || null),
  color_hex: z.union([z.literal(""), z.string().regex(/^#[0-9a-fA-F]{6}$/, "لون غير صالح")]).transform((v) => v || null),
  size: z.string().trim().max(20).transform((v) => v || null),
  sku: z.string().trim().max(60).transform((v) => v || null),
  price_override: optMoney,
  availability: z.enum(["available", "out_of_stock", "discontinued"]),
});

export async function saveVariantAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = f.opt(form, "id");
  const parsed = variantSchema.safeParse({
    product_id: f.str(form, "product_id"),
    color_name: f.str(form, "color_name"),
    color_hex: f.str(form, "color_hex"),
    size: f.str(form, "size"),
    sku: f.str(form, "sku"),
    price_override: f.str(form, "price_override"),
    availability: f.str(form, "availability") || "available",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (!d.color_name && !d.size) return { error: "أدخل اللون أو المقاس على الأقل." };
  const colorHex = d.color_name ? d.color_hex : null;
  try {
    await withAdmin(async (tx, admin) => {
      if (id) {
        await tx.query(
          `update public.product_variants set color_name=$1, color_hex=$2, size=$3, sku=$4, price_override=$5, availability=$6
           where id=$7 and product_id=$8`,
          [d.color_name, colorHex, d.size, d.sku, d.price_override, d.availability, id, d.product_id],
        );
      } else {
        await tx.query(
          `insert into public.product_variants (product_id, color_name, color_hex, size, sku, price_override, availability, sort_order)
           values ($1,$2,$3,$4,$5,$6,$7, (select coalesce(max(sort_order),0)+1 from public.product_variants where product_id=$1))`,
          [d.product_id, d.color_name, colorHex, d.size, d.sku, d.price_override, d.availability],
        );
      }
      await audit(tx, admin, id ? "update_variant" : "create_variant", "product", d.product_id, { color: d.color_name, size: d.size });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true, message: id ? "تم تحديث الخيار." : "تمت إضافة الخيار." };
}

export async function deleteVariantAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  if (!id.success) return { error: "معرّف غير صالح" };
  try {
    await withAdmin(async (tx, admin) => {
      const [v] = await tx.query<{ product_id: string }>("delete from public.product_variants where id = $1 returning product_id", [id.data]);
      await audit(tx, admin, "delete_variant", "product", v?.product_id ?? null, { variant: id.data });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Supplier links (internal costs)
// ---------------------------------------------------------------------------

const linkSchema = z.object({
  product_id: z.uuid(),
  supplier_id: z.uuid("اختر المورد"),
  variant_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
  supplier_sku: z.string().trim().max(80).transform((v) => v || null),
  supplier_url: optUrl,
  cost: money,
  shipping_cost: z.union([z.literal(""), money]).transform((v) => v || "0"),
  currency_code: currency,
  is_primary: z.boolean(),
  notes: z.string().trim().max(1000).transform((v) => v || null),
});

export async function saveSupplierLinkAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = f.opt(form, "id");
  const parsed = linkSchema.safeParse({
    product_id: f.str(form, "product_id"),
    supplier_id: f.str(form, "supplier_id"),
    variant_id: f.str(form, "variant_id"),
    supplier_sku: f.str(form, "supplier_sku"),
    supplier_url: f.str(form, "supplier_url"),
    cost: f.str(form, "cost"),
    shipping_cost: f.str(form, "shipping_cost"),
    currency_code: f.str(form, "currency_code"),
    is_primary: f.bool(form, "is_primary"),
    notes: f.str(form, "notes"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  try {
    await withAdmin(async (tx, admin) => {
      if (d.is_primary) {
        // Only one primary supplier per product/variant.
        await tx.query(
          `update public.supplier_products set is_primary = false
           where product_id = $1 and variant_id is not distinct from $2 and ($3::uuid is null or id <> $3)`,
          [d.product_id, d.variant_id, id],
        );
      }
      if (id) {
        await tx.query(
          `update public.supplier_products set supplier_id=$1, variant_id=$2, supplier_sku=$3, supplier_url=$4, cost=$5,
             shipping_cost=$6, currency_code=$7, is_primary=$8, notes=$9 where id=$10 and product_id=$11`,
          [d.supplier_id, d.variant_id, d.supplier_sku, d.supplier_url, d.cost, d.shipping_cost, d.currency_code, d.is_primary, d.notes, id, d.product_id],
        );
      } else {
        await tx.query(
          `insert into public.supplier_products (supplier_id, product_id, variant_id, supplier_sku, supplier_url, cost, shipping_cost, currency_code, is_primary, notes)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [d.supplier_id, d.product_id, d.variant_id, d.supplier_sku, d.supplier_url, d.cost, d.shipping_cost, d.currency_code, d.is_primary, d.notes],
        );
      }
      await audit(tx, admin, id ? "update_supplier_link" : "create_supplier_link", "product", d.product_id, { supplier: d.supplier_id, cost: d.cost, currency: d.currency_code });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true, message: "تم حفظ بيانات المورد." };
}

export async function deleteSupplierLinkAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  if (!id.success) return { error: "معرّف غير صالح" };
  try {
    await withAdmin(async (tx, admin) => {
      const [l] = await tx.query<{ product_id: string }>("delete from public.supplier_products where id = $1 returning product_id", [id.data]);
      await audit(tx, admin, "delete_supplier_link", "product", l?.product_id ?? null, {});
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name_ar: z.string().trim().min(2, "الاسم مطلوب").max(80),
  name_en: z.string().trim().max(80).transform((v) => v || null),
  slug,
  description_ar: z.string().trim().max(500).transform((v) => v || null),
  image_url: optUrl,
  sort_order: z.coerce.number().int().min(0).max(999),
  is_active: z.boolean(),
});

export async function saveCategoryAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = f.opt(form, "id");
  const parsed = categorySchema.safeParse({
    name_ar: f.str(form, "name_ar"),
    name_en: f.str(form, "name_en"),
    slug: f.str(form, "slug"),
    description_ar: f.str(form, "description_ar"),
    image_url: f.str(form, "image_url"),
    sort_order: f.str(form, "sort_order") || "0",
    is_active: f.bool(form, "is_active"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  try {
    await withAdmin(async (tx, admin) => {
      const vals = [d.name_ar, d.name_en, d.slug, d.description_ar, d.image_url, d.sort_order, d.is_active];
      if (id) {
        await tx.query(
          "update public.categories set name_ar=$1, name_en=$2, slug=$3, description_ar=$4, image_url=$5, sort_order=$6, is_active=$7 where id=$8",
          [...vals, id],
        );
      } else {
        await tx.query(
          "insert into public.categories (name_ar, name_en, slug, description_ar, image_url, sort_order, is_active) values ($1,$2,$3,$4,$5,$6,$7)",
          vals,
        );
      }
      await audit(tx, admin, id ? "update" : "create", "category", id, { slug: d.slug, name: d.name_ar });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true, message: "تم حفظ الفئة." };
}

export async function deleteCategoryAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  if (!id.success) return { error: "معرّف غير صالح" };
  try {
    await withAdmin(async (tx, admin) => {
      // Products in this category become uncategorised (on delete set null).
      const [c] = await tx.query<{ slug: string }>("delete from public.categories where id = $1 returning slug", [id.data]);
      await audit(tx, admin, "delete", "category", id.data, { slug: c?.slug });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true, message: "تم حذف الفئة." };
}

/** Sends a supplier-submitted product back with the admin's note. */
export async function requestProductChangesAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  const note = z.string().trim().min(5, "اكتب ما المطلوب تعديله").max(1000).safeParse(f.str(form, "note"));
  if (!id.success) return { error: "منتج غير صالح." };
  if (!note.success) return { fieldErrors: { note: note.error.issues.map((i) => i.message) } };
  try {
    await withAdmin(async (tx, admin) => {
      const rows = await tx.query(
        `update public.products set review_status = 'changes_requested', review_note = $2
         where id = $1 and submitted_by_supplier is not null and status <> 'published' returning id`,
        [id.data, note.data],
      );
      if (!rows.length) throw new Error("not reviewable");
      await audit(tx, admin, "request_changes", "product", id.data, { note: note.data });
    });
  } catch (e) {
    return { error: e instanceof Error && e.message === "not reviewable" ? "هذا المنتج ليس بانتظار مراجعة." : dbError(e) };
  }
  refresh();
  return { ok: true, message: "أرسلنا ملاحظتك للمورد." };
}
