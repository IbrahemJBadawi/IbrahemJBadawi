/**
 * Supplier portal (framework-free; runs in the caller's transaction).
 * Every function takes the supplier resolved from the signed-in account and
 * filters by it — callers never pass a supplier id from the browser.
 */
import { randomBytes } from "node:crypto";
import type { Tx } from "@/lib/db/core";

export class SupplierError extends Error {}
const fail = (m: string): never => {
  throw new SupplierError(m);
};

export type SupplierAccount = {
  id: string; name: string; agreement_status: string; phone: string | null; whatsapp: string | null; email: string | null;
  contact_name: string | null; city: string | null; governorate_id: string | null; categories_supplied: string | null;
  coverage_areas: string | null; notes: string | null; applied_at: string | null;
};

const ACCOUNT_COLS = `id, name, agreement_status, phone, whatsapp, email, contact_name, city, governorate_id,
  categories_supplied, coverage_areas, notes, applied_at::text`;

export async function supplierForUser(tx: Tx, userId: string) {
  const [s] = await tx.query<SupplierAccount>(`select ${ACCOUNT_COLS} from public.suppliers where owner_user_id = $1`, [userId]);
  return s ?? null;
}

export type ApplyInput = {
  name: string; contactName: string; phone: string; whatsapp: string | null; email: string | null;
  governorateId: string | null; city: string; categories: string; notes: string | null;
};

/** Self-registration: creates the supplier record (status «applied») and gives the account the supplier role. */
export async function applyAsSupplier(tx: Tx, userId: string, input: ApplyInput) {
  const [role] = await tx.query<{ role: string }>("select role from public.profiles where id = $1", [userId]);
  if (!role) fail("الحساب غير موجود.");
  if (role.role === "admin") fail("حساب الإدارة لا يحتاج إلى حساب مورد.");
  if (await supplierForUser(tx, userId)) fail("لديك حساب مورد بالفعل.");
  const [s] = await tx.query<{ id: string }>(
    `insert into public.suppliers (name, contact_name, phone, whatsapp, email, country_code, ships_to, governorate_id, city,
       categories_supplied, notes, agreement_status, owner_user_id, applied_at, accepts_single_item, accepts_dropship)
     values ($1,$2,$3,$4,$5,'PS','{PS}',$6,$7,$8,$9,'applied',$10, now(), true, true) returning id`,
    [input.name, input.contactName, input.phone, input.whatsapp, input.email, input.governorateId, input.city, input.categories, input.notes, userId],
  );
  await tx.query("update public.profiles set role = 'supplier' where id = $1 and role = 'customer'", [userId]);
  return s.id;
}

export async function updateSupplierProfile(tx: Tx, supplierId: string, input: Omit<ApplyInput, "name"> & { coverage: string | null }) {
  await tx.query(
    `update public.suppliers set contact_name = $2, phone = $3, whatsapp = $4, email = $5, governorate_id = $6, city = $7,
       categories_supplied = $8, notes = $9, coverage_areas = $10 where id = $1`,
    [supplierId, input.contactName, input.phone, input.whatsapp, input.email, input.governorateId, input.city, input.categories, input.notes, input.coverage],
  );
}

export type SupplierProductRow = {
  id: string; slug: string; name_ar: string; status: string; review_status: string | null; review_note: string | null;
  price: string; cost: string | null; availability: string; image: string | null; updated_at: string;
};

export async function listSupplierProducts(tx: Tx, supplierId: string) {
  return tx.query<SupplierProductRow>(
    `select p.id, p.slug, p.name_ar, p.status, p.review_status, p.review_note, p.price::text, sp.cost::text, p.availability,
            p.images->0->>'url' as image, p.updated_at::text
     from public.products p join public.supplier_products sp on sp.product_id = p.id and sp.is_primary and sp.variant_id is null
     where sp.supplier_id = $1 order by p.updated_at desc`,
    [supplierId],
  );
}

export type SupplierProductInput = {
  name: string; description: string | null; categoryId: string | null; cost: string; suggestedPrice: string;
  sizes: string[]; colors: { name: string; hex: string | null }[]; images: { url: string; alt?: string }[];
  availability: "available" | "out_of_stock"; processingDays: number | null;
};

export async function getSupplierProduct(tx: Tx, supplierId: string, productId: string) {
  const [p] = await tx.query<{
    id: string; name_ar: string; description_ar: string | null; category_id: string | null; price: string; cost: string;
    status: string; review_status: string | null; review_note: string | null; availability: string; processing_days: number | null;
    images: { url: string; alt?: string }[];
  }>(
    `select p.id, p.name_ar, p.description_ar, p.category_id, p.price::text, sp.cost::text, p.status, p.review_status, p.review_note,
            p.availability, p.processing_days, p.images
     from public.products p join public.supplier_products sp on sp.product_id = p.id and sp.is_primary and sp.variant_id is null
     where p.id = $1 and sp.supplier_id = $2`,
    [productId, supplierId],
  );
  if (!p) return null;
  const variants = await tx.query<{ color_name: string | null; color_hex: string | null; size: string | null }>(
    "select color_name, color_hex, size from public.product_variants where product_id = $1 order by sort_order",
    [productId],
  );
  return { ...p, variants };
}

async function writeVariants(tx: Tx, productId: string, input: SupplierProductInput) {
  await tx.query("delete from public.product_variants where product_id = $1", [productId]);
  const colors = input.colors.length ? input.colors : [{ name: null as string | null, hex: null as string | null }];
  const sizes = input.sizes.length ? input.sizes : [null as string | null];
  let order = 0;
  for (const c of colors) {
    for (const size of sizes) {
      await tx.query(
        "insert into public.product_variants (product_id, color_name, color_hex, size, availability, sort_order) values ($1,$2,$3,$4,$5,$6)",
        [productId, c.name, c.hex, size, input.availability, order++],
      );
    }
  }
}

/** Creates or updates a supplier's product and sends it for review. Published products only accept stock/cost updates. */
export async function saveSupplierProduct(tx: Tx, supplier: SupplierAccount, productId: string | null, input: SupplierProductInput) {
  if (supplier.agreement_status === "suspended") fail("حساب المورد موقوف حاليًا. تواصل مع فريق المنصة.");
  if (Number(input.suggestedPrice) < Number(input.cost)) fail("سعر البيع المقترح يجب ألا يقل عن سعرك.");
  if (!productId) {
    const slug = `p-${randomBytes(5).toString("hex")}`;
    const [p] = await tx.query<{ id: string }>(
      `insert into public.products (slug, name_ar, description_ar, category_id, price, currency_code, images, availability, status,
         submitted_by_supplier, review_status, submitted_at, processing_days)
       values ($1,$2,$3,$4,$5,'ILS',$6::text::jsonb,$7,'draft',$8,'pending',now(),$9) returning id`,
      [slug, input.name, input.description, input.categoryId, input.suggestedPrice, JSON.stringify(input.images), input.availability, supplier.id, input.processingDays],
    );
    await tx.query(
      "insert into public.supplier_products (supplier_id, product_id, cost, currency_code, is_primary) values ($1,$2,$3,'ILS',true)",
      [supplier.id, p.id, input.cost],
    );
    await writeVariants(tx, p.id, input);
    return p.id;
  }
  const current = await getSupplierProduct(tx, supplier.id, productId);
  if (!current) fail("المنتج غير موجود.");
  await tx.query("update public.supplier_products set cost = $3, updated_at = now() where supplier_id = $1 and product_id = $2 and variant_id is null", [supplier.id, productId, input.cost]);
  if (current!.status === "published") {
    // Live products: only stock and cost change here; content changes go through the team.
    await tx.query("update public.products set availability = $2 where id = $1", [productId, input.availability]);
    await tx.query("update public.product_variants set availability = $2 where product_id = $1", [productId, input.availability]);
    if (current!.cost !== null && Number(current!.cost) !== Number(input.cost)) {
      await tx.query("select public.notify_admins('admin_supplier', $1, $2, $3, 'product', $4::uuid)", [
        `تغيّر سعر المورد: ${current!.name_ar}`, `${supplier.name}: ${current!.cost} ← ${input.cost}`, `/admin/products/${productId}`, productId,
      ]);
    }
    return productId;
  }
  const ordered = await tx.query("select 1 from public.order_items where product_id = $1 limit 1", [productId]);
  await tx.query(
    `update public.products set name_ar = $2, description_ar = $3, category_id = $4, price = $5, images = $6::text::jsonb,
       availability = $7, processing_days = $8, review_status = 'pending', review_note = null, submitted_at = now()
     where id = $1`,
    [productId, input.name, input.description, input.categoryId, input.suggestedPrice, JSON.stringify(input.images), input.availability, input.processingDays],
  );
  if (!ordered.length) await writeVariants(tx, productId, input);
  return productId;
}

export type SupplierOrderRow = {
  fulfillment_id: string; order_number: string; status: string; created_at: string; governorate_name: string | null;
  items: { name: string; variant: string | null; quantity: number }[];
  // Delivery details only once the team has sent the order to this supplier.
  customer_name: string | null; customer_phone: string | null; city: string | null; address_line: string | null;
  carrier: string | null; tracking_number: string | null;
};

const SHARED = ["sent_to_supplier", "supplier_accepted", "preparing", "shipped"];

export async function listSupplierOrders(tx: Tx, supplierId: string) {
  const rows = await tx.query<Omit<SupplierOrderRow, "items" | "customer_name" | "customer_phone" | "city" | "address_line"> & {
    order_id: string; o_name: string; o_phone: string; o_city: string; o_address: string;
  }>(
    `select f.id as fulfillment_id, f.order_id, o.order_number, f.status, f.created_at::text, o.governorate_name,
            o.customer_name as o_name, o.customer_phone as o_phone, o.city as o_city, o.address_line as o_address,
            f.carrier, f.tracking_number
     from public.fulfillment_records f join public.orders o on o.id = f.order_id
     where f.supplier_id = $1 and f.status <> 'awaiting_supplier'
     order by f.created_at desc limit 100`,
    [supplierId],
  );
  const out: SupplierOrderRow[] = [];
  for (const r of rows) {
    const items = await tx.query<{ name: string; variant: string | null; quantity: number }>(
      `select oi.product_name as name, oi.variant_label as variant, oi.quantity
       from public.order_items oi join public.supplier_products sp on sp.product_id = oi.product_id and sp.is_primary and sp.variant_id is null
       where oi.order_id = $1 and sp.supplier_id = $2`,
      [r.order_id, supplierId],
    );
    const share = SHARED.includes(r.status);
    out.push({
      fulfillment_id: r.fulfillment_id, order_number: r.order_number, status: r.status, created_at: r.created_at,
      governorate_name: r.governorate_name, items, carrier: r.carrier, tracking_number: r.tracking_number,
      customer_name: share ? r.o_name : null, customer_phone: share ? r.o_phone : null,
      city: share ? r.o_city : null, address_line: share ? r.o_address : null,
    });
  }
  return out;
}

const NEXT: Record<string, string[]> = {
  sent_to_supplier: ["supplier_accepted"],
  supplier_accepted: ["preparing", "shipped"],
  preparing: ["shipped"],
};

/** A supplier moves their own fulfillment forward: accepted → preparing → shipped (with tracking). */
export async function supplierUpdateFulfillment(
  tx: Tx, supplier: SupplierAccount, fulfillmentId: string, input: { status: string; carrier: string | null; tracking: string | null },
) {
  const [f] = await tx.query<{ status: string; order_number: string; order_id: string }>(
    `select f.status, o.order_number, f.order_id from public.fulfillment_records f join public.orders o on o.id = f.order_id
     where f.id = $1 and f.supplier_id = $2 for update of f`,
    [fulfillmentId, supplier.id],
  );
  if (!f) fail("الطلب غير موجود.");
  if (!(NEXT[f!.status] ?? []).includes(input.status)) fail("لا يمكن الانتقال إلى هذه الحالة الآن.");
  if (input.status === "shipped" && !input.tracking && !input.carrier) fail("أدخل شركة التوصيل أو رقم التتبع.");
  await tx.query(
    `update public.fulfillment_records set status = $2, carrier = coalesce($3, carrier), tracking_number = coalesce($4, tracking_number)
     where id = $1`,
    [fulfillmentId, input.status, input.carrier, input.tracking],
  );
  const label = { supplier_accepted: "قبل المورد الطلب", preparing: "المورد يجهّز الطلب", shipped: "شحن المورد الطلب" }[input.status as "shipped"];
  await tx.query("select public.notify_admins('admin_supplier', $1, $2, $3, 'order', $4::uuid)", [
    `${label} ${f!.order_number}`, `${supplier.name}${input.tracking ? ` · تتبع: ${input.tracking}` : ""}`, `/admin/orders/${f!.order_id}`, f!.order_id,
  ]);
}
