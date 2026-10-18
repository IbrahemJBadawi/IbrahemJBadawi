"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { audit, withAdmin } from "@/lib/admin";
import { country, currency, dbError, f, fieldErrors, money, optMoney, optUrl, slug } from "@/lib/admin/form";
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

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------

const tri = z.enum(["", "yes", "no"]).transform((v) => (v === "" ? null : v === "yes"));
const optText = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const supplierSchema = z.object({
  name: z.string().trim().min(2, "اسم المورد مطلوب").max(120),
  contact_name: optText(120),
  email: z.union([z.literal(""), z.email("بريد غير صالح")]).transform((v) => v || null),
  phone: optText(40),
  whatsapp: optText(40),
  social_links: optText(500),
  website: optUrl,
  country_code: z.union([z.literal(""), country]).transform((v) => v || null),
  coverage_areas: optText(500),
  categories_supplied: optText(500),
  ships_to: z.array(country),
  cod_countries: z.array(country),
  processing_days: z.coerce.number().int().min(0).max(90),
  delivery_days: z.union([z.literal(""), z.coerce.number().int().min(0).max(90)]).transform((v) => (v === "" ? null : v)),
  return_policy: optText(2000),
  min_order: optText(200),
  accepts_single_item: tri,
  accepts_dropship: tri,
  accepts_pay_after_collection: tri,
  accepts_cod: tri,
  collection_party: z.enum(["", "platform", "supplier", "courier"]).transform((v) => v || null),
  settlement_method: optText(300),
  agreement_status: z.enum(["contacting", "negotiating", "approved", "suspended"]),
  notes: optText(4000),
  is_active: z.boolean(),
});

const SUPPLIER_COLS = [
  "name", "contact_name", "email", "phone", "whatsapp", "social_links", "website", "country_code", "coverage_areas",
  "categories_supplied", "ships_to", "cod_countries", "processing_days", "delivery_days", "return_policy", "min_order",
  "accepts_single_item", "accepts_dropship", "accepts_pay_after_collection", "accepts_cod", "collection_party",
  "settlement_method", "agreement_status", "notes", "is_active",
] as const;

export async function saveSupplierAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = f.opt(form, "id");
  const raw: Record<string, unknown> = {};
  for (const k of SUPPLIER_COLS) raw[k] = f.str(form, k);
  raw.country_code = f.str(form, "country_code").toUpperCase();
  raw.ships_to = f.list(form, "ships_to");
  raw.cod_countries = f.list(form, "cod_countries");
  raw.processing_days = f.str(form, "processing_days") || "0";
  raw.is_active = f.bool(form, "is_active");
  const p = supplierSchema.safeParse(raw);
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  const confirmTerms = f.bool(form, "confirm_terms");
  const confirmPrices = f.bool(form, "confirm_prices");
  if (d.agreement_status === "approved" && !confirmTerms && !(await supplierTermsConfirmed(id))) {
    return { error: "لاعتماد المورد يجب أن تؤكد بنفسك أنه وافق فعليًا على شروط المنصة (خانة تأكيد الشروط)." };
  }
  const vals = SUPPLIER_COLS.map((k) => d[k]);
  const sets = SUPPLIER_COLS.map((k, i) => `${k} = $${i + 1}${k === "ships_to" || k === "cod_countries" ? "::text[]" : ""}`).join(", ");
  let newId: string | null = null;
  try {
    await withAdmin(async (tx, admin) => {
      if (id) {
        await tx.query(`update public.suppliers set ${sets} where id = $${vals.length + 1}`, [...vals, id]);
      } else {
        const [row] = await tx.query<{ id: string }>(
          `insert into public.suppliers (${SUPPLIER_COLS.join(", ")}) values (${SUPPLIER_COLS.map((k, i) => `$${i + 1}${k === "ships_to" || k === "cod_countries" ? "::text[]" : ""}`).join(", ")}) returning id`,
          vals,
        );
        newId = row.id;
      }
      const sid = id ?? newId!;
      if (confirmTerms) await tx.query("update public.suppliers set terms_confirmed_at = now(), terms_confirmed_by = $1 where id = $2", [admin.id, sid]);
      if (confirmPrices) await tx.query("update public.suppliers set prices_confirmed_at = now() where id = $1", [sid]);
      await audit(tx, admin, id ? "update" : "create", "supplier", sid, { name: d.name, agreement_status: d.agreement_status, terms_confirmed: confirmTerms });
    });
  } catch (e) {
    return { error: dbError(e) };
  }
  if (newId) redirect(`/admin/suppliers/${newId}`);
  return done("تم حفظ المورد.");
}

async function supplierTermsConfirmed(id: string | null) {
  if (!id) return false;
  const rows = await withAdmin((tx) => tx.query("select 1 from public.suppliers where id = $1 and terms_confirmed_at is not null", [id]));
  return rows.length > 0;
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
    governorate_id: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
    name_ar: z.string().trim().min(2, "الاسم مطلوب").max(80),
    rate: money,
    estimated_cost: optMoney,
    carrier: optText(120),
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
    governorate_id: f.str(form, "governorate_id"),
    name_ar: f.str(form, "name_ar"),
    rate: f.str(form, "rate"),
    estimated_cost: f.str(form, "estimated_cost"),
    carrier: f.str(form, "carrier"),
    free_shipping_threshold: f.str(form, "free_shipping_threshold"),
    min_days: f.str(form, "min_days"),
    max_days: f.str(form, "max_days"),
    cod_available: f.bool(form, "cod_available"),
    is_active: f.bool(form, "is_active"),
    notes: f.str(form, "notes"),
  });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  const vals = [d.country_code, d.currency_code, d.name_ar, d.rate, d.free_shipping_threshold, d.min_days, d.max_days, d.cod_available, d.is_active, d.notes, d.governorate_id, d.estimated_cost, d.carrier];
  return run(async (tx, admin) => {
    if (id) {
      await tx.query(
        `update public.shipping_zones set country_code=$1, currency_code=$2, name_ar=$3, rate=$4, free_shipping_threshold=$5,
           min_days=$6, max_days=$7, cod_available=$8, is_active=$9, notes=$10, governorate_id=$11, estimated_cost=$12, carrier=$13 where id=$14`,
        [...vals, id],
      );
    } else {
      await tx.query(
        `insert into public.shipping_zones (country_code, currency_code, name_ar, rate, free_shipping_threshold, min_days, max_days, cod_available, is_active, notes, governorate_id, estimated_cost, carrier)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
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
// Bank transfer settings (never invented — entered by the owner)
// ---------------------------------------------------------------------------

export async function savePaymentSettingsAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      bank_transfer_enabled: z.boolean(),
      beneficiary_name: optText(120),
      bank_name: optText(120),
      transfer_details: optText(1000),
      instructions: optText(2000),
      validity_hours: z.union([z.literal(""), z.coerce.number().int().min(1).max(720)]).transform((v) => (v === "" ? null : v)),
      proof_review_policy: optText(1000),
      contact: optText(200),
    })
    .safeParse({
      bank_transfer_enabled: f.bool(form, "bank_transfer_enabled"),
      beneficiary_name: f.str(form, "beneficiary_name"),
      bank_name: f.str(form, "bank_name"),
      transfer_details: f.str(form, "transfer_details"),
      instructions: f.str(form, "instructions"),
      validity_hours: f.str(form, "validity_hours"),
      proof_review_policy: f.str(form, "proof_review_policy"),
      contact: f.str(form, "contact"),
    });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  if (d.bank_transfer_enabled && !d.transfer_details && !d.beneficiary_name) {
    return { error: "لتفعيل عرض التعليمات أدخل اسم المستفيد أو تفاصيل التحويل." };
  }
  return run(async (tx, admin) => {
    await tx.query(
      `update public.payment_settings set bank_transfer_enabled=$1, beneficiary_name=$2, bank_name=$3, transfer_details=$4,
         instructions=$5, validity_hours=$6, proof_review_policy=$7, contact=$8 where id = 1`,
      [d.bank_transfer_enabled, d.beneficiary_name, d.bank_name, d.transfer_details, d.instructions, d.validity_hours, d.proof_review_policy, d.contact],
    );
    // Details themselves are not copied into the audit log.
    await audit(tx, admin, "update", "payment_settings", "1", { enabled: d.bank_transfer_enabled });
  }, "تم حفظ إعدادات التحويل البنكي.");
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
