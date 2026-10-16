"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { audit, withAdmin } from "@/lib/admin";
import { country, currency, dbError, f, fieldErrors, money, optMoney, optUrl, slug } from "@/lib/admin/form";
import { canTransition } from "@/lib/pricing";
import { toMills } from "@/lib/money";
import type { ActionResult } from "@/components/forms/ActionForm";

const done = (message = "تم الحفظ."): ActionResult => {
  refresh();
  return { ok: true, message };
};

async function run(fn: Parameters<typeof withAdmin>[0], message?: string): Promise<ActionResult> {
  try {
    await withAdmin(fn);
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    return { error: dbError(e) };
  }
  return done(message);
}

class UserError extends Error {}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function updateOrderStatusAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      id: z.uuid(),
      status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"]),
      note: z.string().trim().max(500),
      visible: z.boolean(),
    })
    .safeParse({ id: f.str(form, "id"), status: f.str(form, "status"), note: f.str(form, "note"), visible: f.bool(form, "visible") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  return run(async (tx, admin) => {
    const [o] = await tx.query<{ status: string }>("select status from public.orders where id = $1 for update", [d.id]);
    if (!o) throw new UserError("الطلب غير موجود.");
    if (!canTransition(o.status, d.status)) throw new UserError("لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية.");
    if (d.status === "cancelled" && !d.note) throw new UserError("اكتب سبب الإلغاء في الملاحظة.");
    await tx.query("update public.orders set status = $1, cancel_reason = case when $1 = 'cancelled' then $2 else cancel_reason end where id = $3", [d.status, d.note || null, d.id]);
    if (d.status === "cancelled") {
      await tx.query("update public.fulfillment_records set status = 'cancelled' where order_id = $1 and status in ('pending', 'sent_to_supplier', 'confirmed')", [d.id]);
    }
    await tx.query(
      "insert into public.order_events (order_id, status, note, visible_to_customer, actor_id) values ($1,$2,$3,$4,$5)",
      [d.id, d.status, d.note || null, d.visible, admin.id],
    );
    await audit(tx, admin, "order_status", "order", d.id, { from: o.status, to: d.status });
  }, "تم تحديث حالة الطلب.");
}

export async function updatePaymentStatusAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({ id: z.uuid(), payment_status: z.enum(["unpaid", "paid", "refunded", "partially_refunded"]) })
    .safeParse({ id: f.str(form, "id"), payment_status: f.str(form, "payment_status") });
  if (!p.success) return { error: "قيمة غير صالحة." };
  return run(async (tx, admin) => {
    const [o] = await tx.query<{ payment_status: string }>("select payment_status from public.orders where id = $1", [p.data.id]);
    await tx.query("update public.orders set payment_status = $1 where id = $2", [p.data.payment_status, p.data.id]);
    await audit(tx, admin, "payment_status", "order", p.data.id, { from: o?.payment_status, to: p.data.payment_status });
  }, "تم تحديث حالة الدفع.");
}

export async function addOrderNoteAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  const note = f.str(form, "note");
  if (!id.success || note.length < 2 || note.length > 1000) return { error: "اكتب ملاحظة صالحة." };
  return run(async (tx, admin) => {
    await tx.query(
      "insert into public.order_events (order_id, note, visible_to_customer, actor_id) values ($1,$2,$3,$4)",
      [id.data, note, f.bool(form, "visible"), admin.id],
    );
  }, "تمت إضافة الملاحظة.");
}

const fulfillmentSchema = z.object({
  id: z.uuid(),
  supplier_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
  status: z.enum(["pending", "sent_to_supplier", "confirmed", "shipped", "delivered", "cancelled", "failed"]),
  supplier_order_ref: z.string().trim().max(120).transform((v) => v || null),
  carrier: z.string().trim().max(80).transform((v) => v || null),
  tracking_number: z.string().trim().max(120).transform((v) => v || null),
  tracking_url: optUrl,
  cost_currency: z.union([z.literal(""), currency]).transform((v) => v || null),
  actual_cost: optMoney,
  actual_shipping_cost: optMoney,
  notes: z.string().trim().max(2000).transform((v) => v || null),
});

export async function updateFulfillmentAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = fulfillmentSchema.safeParse(Object.fromEntries(
    ["id", "supplier_id", "status", "supplier_order_ref", "carrier", "tracking_number", "tracking_url", "cost_currency", "actual_cost", "actual_shipping_cost", "notes"].map((k) => [k, f.str(form, k)]),
  ));
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  if ((d.actual_cost || d.actual_shipping_cost) && !d.cost_currency) return { error: "حدد عملة التكلفة الفعلية." };
  return run(async (tx, admin) => {
    const [prev] = await tx.query<{ status: string; order_id: string }>("select status, order_id from public.fulfillment_records where id = $1", [d.id]);
    if (!prev) throw new UserError("سجل التنفيذ غير موجود.");
    await tx.query(
      `update public.fulfillment_records set supplier_id=$1, status=$2, supplier_order_ref=$3, carrier=$4, tracking_number=$5,
         tracking_url=$6, cost_currency=$7, actual_cost=$8, actual_shipping_cost=$9, notes=$10,
         sent_at = case when $2 = 'sent_to_supplier' and sent_at is null then now() else sent_at end,
         shipped_at = case when $2 = 'shipped' and shipped_at is null then now() else shipped_at end,
         delivered_at = case when $2 = 'delivered' and delivered_at is null then now() else delivered_at end
       where id = $11`,
      [d.supplier_id, d.status, d.supplier_order_ref, d.carrier, d.tracking_number, d.tracking_url, d.cost_currency, d.actual_cost, d.actual_shipping_cost, d.notes, d.id],
    );
    await audit(tx, admin, "fulfillment_update", "order", prev.order_id, { fulfillment: d.id, from: prev.status, to: d.status, actual_cost: d.actual_cost });
  }, "تم حفظ سجل التنفيذ.");
}

export async function updateReturnAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      id: z.uuid(),
      status: z.enum(["requested", "approved", "rejected", "received", "refunded"]),
      refund_amount: optMoney,
      admin_notes: z.string().trim().max(2000).transform((v) => v || null),
    })
    .safeParse({ id: f.str(form, "id"), status: f.str(form, "status"), refund_amount: f.str(form, "refund_amount"), admin_notes: f.str(form, "admin_notes") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  if (d.status === "refunded" && !d.refund_amount) return { error: "أدخل المبلغ المسترد." };
  return run(async (tx, admin) => {
    const [r] = await tx.query<{ order_id: string; total: string }>(
      "select r.order_id, o.total::text from public.return_requests r join public.orders o on o.id = r.order_id where r.id = $1",
      [d.id],
    );
    if (!r) throw new UserError("طلب الإرجاع غير موجود.");
    if (d.refund_amount && toMills(d.refund_amount) > toMills(r.total)) throw new UserError("المبلغ المسترد أكبر من إجمالي الطلب.");
    await tx.query("update public.return_requests set status=$1, refund_amount=$2, admin_notes=$3 where id=$4", [d.status, d.refund_amount, d.admin_notes, d.id]);
    if (d.status === "refunded" && d.refund_amount) {
      const full = toMills(d.refund_amount) === toMills(r.total);
      await tx.query("update public.orders set payment_status = $1 where id = $2", [full ? "refunded" : "partially_refunded", r.order_id]);
    }
    await tx.query(
      "insert into public.order_events (order_id, note, visible_to_customer, actor_id) values ($1, $2, true, $3)",
      [r.order_id, `تحديث طلب الإرجاع: ${{ requested: "تم الطلب", approved: "مقبول", rejected: "مرفوض", received: "تم استلام المرتجع", refunded: "تم الاسترداد" }[d.status]}`, admin.id],
    );
    await audit(tx, admin, "return_update", "order", r.order_id, { return: d.id, status: d.status, refund: d.refund_amount });
  }, "تم تحديث طلب الإرجاع.");
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

const supplierSchema = z.object({
  name: z.string().trim().min(2, "اسم المورد مطلوب").max(120),
  contact_name: z.string().trim().max(120).transform((v) => v || null),
  email: z.union([z.literal(""), z.email("بريد غير صالح")]).transform((v) => v || null),
  phone: z.string().trim().max(40).transform((v) => v || null),
  whatsapp: z.string().trim().max(40).transform((v) => v || null),
  website: optUrl,
  country_code: z.union([z.literal(""), country]).transform((v) => v || null),
  ships_to: z.array(country),
  cod_countries: z.array(country),
  processing_days: z.coerce.number().int().min(0).max(90),
  notes: z.string().trim().max(4000).transform((v) => v || null),
  is_active: z.boolean(),
});

export async function saveSupplierAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = f.opt(form, "id");
  const p = supplierSchema.safeParse({
    name: f.str(form, "name"),
    contact_name: f.str(form, "contact_name"),
    email: f.str(form, "email"),
    phone: f.str(form, "phone"),
    whatsapp: f.str(form, "whatsapp"),
    website: f.str(form, "website"),
    country_code: f.str(form, "country_code").toUpperCase(),
    ships_to: f.list(form, "ships_to"),
    cod_countries: f.list(form, "cod_countries"),
    processing_days: f.str(form, "processing_days") || "0",
    notes: f.str(form, "notes"),
    is_active: f.bool(form, "is_active"),
  });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  const vals = [d.name, d.contact_name, d.email, d.phone, d.whatsapp, d.website, d.country_code, d.ships_to, d.cod_countries, d.processing_days, d.notes, d.is_active];
  let newId: string | null = null;
  try {
    await withAdmin(async (tx, admin) => {
      if (id) {
        await tx.query(
          `update public.suppliers set name=$1, contact_name=$2, email=$3, phone=$4, whatsapp=$5, website=$6, country_code=$7,
             ships_to=$8::text[], cod_countries=$9::text[], processing_days=$10, notes=$11, is_active=$12 where id=$13`,
          [...vals, id],
        );
      } else {
        const [row] = await tx.query<{ id: string }>(
          `insert into public.suppliers (name, contact_name, email, phone, whatsapp, website, country_code, ships_to, cod_countries, processing_days, notes, is_active)
           values ($1,$2,$3,$4,$5,$6,$7,$8::text[],$9::text[],$10,$11,$12) returning id`,
          vals,
        );
        newId = row.id;
      }
      await audit(tx, admin, id ? "update" : "create", "supplier", id ?? newId, { name: d.name });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  if (newId) redirect(`/admin/suppliers/${newId}`);
  return done("تم حفظ المورد.");
}

export async function deleteSupplierAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  if (!id.success) return { error: "معرّف غير صالح" };
  try {
    await withAdmin(async (tx, admin) => {
      const [s] = await tx.query<{ name: string }>("delete from public.suppliers where id = $1 returning name", [id.data]);
      await audit(tx, admin, "delete", "supplier", id.data, { name: s?.name });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  redirect("/admin/suppliers");
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function setRoleAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ id: z.uuid(), role: z.enum(["customer", "admin"]) }).safeParse({ id: f.str(form, "id"), role: f.str(form, "role") });
  if (!p.success) return { error: "قيمة غير صالحة." };
  try {
    await withAdmin(async (tx, admin) => {
      if (p.data.id === admin.id) throw new UserError("لا يمكنك تغيير صلاحيتك بنفسك.");
      await tx.query("select public.admin_set_role($1, $2)", [p.data.id, p.data.role]);
      await audit(tx, admin, "set_role", "profile", p.data.id, { role: p.data.role });
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    return { error: dbError(e) };
  }
  return done("تم تحديث الصلاحية.");
}

// ---------------------------------------------------------------------------
// Countries, currencies, shipping zones
// ---------------------------------------------------------------------------

export async function toggleCurrencyAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const code = currency.safeParse(f.str(form, "code"));
  if (!code.success) return { error: "عملة غير صالحة" };
  const active = f.bool(form, "is_active");
  return run(async (tx, admin) => {
    await tx.query("update public.currencies set is_active = $1 where code = $2", [active, code.data]);
    await audit(tx, admin, active ? "activate" : "deactivate", "currency", code.data);
  });
}

export async function saveCountryAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({ code: country, is_active: z.boolean(), default_currency: currency })
    .safeParse({ code: f.str(form, "code"), is_active: f.bool(form, "is_active"), default_currency: f.str(form, "default_currency") });
  if (!p.success) return { error: "بيانات غير صالحة" };
  return run(async (tx, admin) => {
    await tx.query("update public.countries set is_active = $1, default_currency = $2 where code = $3", [p.data.is_active, p.data.default_currency, p.data.code]);
    await audit(tx, admin, "update", "country", p.data.code, { is_active: p.data.is_active });
  });
}

const zoneSchema = z
  .object({
    country_code: country,
    currency_code: currency,
    name_ar: z.string().trim().min(2, "الاسم مطلوب").max(80),
    rate: money,
    free_shipping_threshold: optMoney,
    min_days: z.coerce.number().int().min(0).max(120),
    max_days: z.coerce.number().int().min(0).max(120),
    cod_available: z.boolean(),
    is_active: z.boolean(),
    notes: z.string().trim().max(500).transform((v) => v || null),
  })
  .refine((d) => d.max_days >= d.min_days, { message: "أقصى مدة يجب أن تكون أكبر من أو تساوي أقل مدة", path: ["max_days"] });

export async function saveZoneAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = f.opt(form, "id");
  const p = zoneSchema.safeParse({
    country_code: f.str(form, "country_code"),
    currency_code: f.str(form, "currency_code"),
    name_ar: f.str(form, "name_ar"),
    rate: f.str(form, "rate"),
    free_shipping_threshold: f.str(form, "free_shipping_threshold"),
    min_days: f.str(form, "min_days"),
    max_days: f.str(form, "max_days"),
    cod_available: f.bool(form, "cod_available"),
    is_active: f.bool(form, "is_active"),
    notes: f.str(form, "notes"),
  });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  const vals = [d.country_code, d.currency_code, d.name_ar, d.rate, d.free_shipping_threshold, d.min_days, d.max_days, d.cod_available, d.is_active, d.notes];
  return run(async (tx, admin) => {
    if (id) {
      await tx.query(
        `update public.shipping_zones set country_code=$1, currency_code=$2, name_ar=$3, rate=$4, free_shipping_threshold=$5,
           min_days=$6, max_days=$7, cod_available=$8, is_active=$9, notes=$10 where id=$11`,
        [...vals, id],
      );
    } else {
      await tx.query(
        `insert into public.shipping_zones (country_code, currency_code, name_ar, rate, free_shipping_threshold, min_days, max_days, cod_available, is_active, notes)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        vals,
      );
    }
    await audit(tx, admin, id ? "update" : "create", "shipping_zone", id, { country: d.country_code, currency: d.currency_code, rate: d.rate, cod: d.cod_available });
  }, "تم حفظ منطقة الشحن.");
}

export async function deleteZoneAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(f.str(form, "id"));
  if (!id.success) return { error: "معرّف غير صالح" };
  return run(async (tx, admin) => {
    await tx.query("delete from public.shipping_zones where id = $1", [id.data]);
    await audit(tx, admin, "delete", "shipping_zone", id.data);
  }, "تم حذف منطقة الشحن.");
}

// ---------------------------------------------------------------------------
// Store settings, pages, messages
// ---------------------------------------------------------------------------

export async function saveSettingsAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      store_name_ar: z.string().trim().min(2).max(80),
      store_name_en: z.string().trim().min(2).max(80),
      tagline_ar: z.string().trim().max(160).transform((v) => v || null),
      announcement_ar: z.string().trim().max(200).transform((v) => v || null),
      contact_email: z.union([z.literal(""), z.email("بريد غير صالح")]).transform((v) => v || null),
      contact_phone: z.string().trim().max(40).transform((v) => v || null),
      whatsapp: z.string().trim().max(40).transform((v) => v || null),
      default_currency: currency,
      cod_enabled: z.boolean(),
      manual_orders_enabled: z.boolean(),
    })
    .safeParse({
      store_name_ar: f.str(form, "store_name_ar"),
      store_name_en: f.str(form, "store_name_en"),
      tagline_ar: f.str(form, "tagline_ar"),
      announcement_ar: f.str(form, "announcement_ar"),
      contact_email: f.str(form, "contact_email"),
      contact_phone: f.str(form, "contact_phone"),
      whatsapp: f.str(form, "whatsapp"),
      default_currency: f.str(form, "default_currency"),
      cod_enabled: f.bool(form, "cod_enabled"),
      manual_orders_enabled: f.bool(form, "manual_orders_enabled"),
    });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  return run(async (tx, admin) => {
    await tx.query(
      `update public.store_settings set store_name_ar=$1, store_name_en=$2, tagline_ar=$3, announcement_ar=$4, contact_email=$5,
         contact_phone=$6, whatsapp=$7, default_currency=$8, cod_enabled=$9, manual_orders_enabled=$10 where id = 1`,
      [d.store_name_ar, d.store_name_en, d.tagline_ar, d.announcement_ar, d.contact_email, d.contact_phone, d.whatsapp, d.default_currency, d.cod_enabled, d.manual_orders_enabled],
    );
    await audit(tx, admin, "update", "store_settings", "1", { cod_enabled: d.cod_enabled, manual_orders_enabled: d.manual_orders_enabled });
  }, "تم حفظ الإعدادات.");
}

export async function savePageAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({ slug, title_ar: z.string().trim().min(2).max(120), body_ar: z.string().max(30000), is_published: z.boolean() })
    .safeParse({ slug: f.str(form, "slug"), title_ar: f.str(form, "title_ar"), body_ar: String(form.get("body_ar") ?? ""), is_published: f.bool(form, "is_published") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  return run(async (tx, admin) => {
    await tx.query(
      `insert into public.pages (slug, title_ar, body_ar, is_published) values ($1,$2,$3,$4)
       on conflict (slug) do update set title_ar = excluded.title_ar, body_ar = excluded.body_ar, is_published = excluded.is_published`,
      [p.data.slug, p.data.title_ar, p.data.body_ar, p.data.is_published],
    );
    await audit(tx, admin, "update", "page", p.data.slug);
  }, "تم حفظ الصفحة.");
}

export async function updateMessageStatusAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ id: z.uuid(), status: z.enum(["new", "in_progress", "closed"]) }).safeParse({ id: f.str(form, "id"), status: f.str(form, "status") });
  if (!p.success) return { error: "قيمة غير صالحة." };
  return run(async (tx) => {
    await tx.query("update public.contact_messages set status = $1 where id = $2", [p.data.status, p.data.id]);
  }, "تم التحديث.");
}
