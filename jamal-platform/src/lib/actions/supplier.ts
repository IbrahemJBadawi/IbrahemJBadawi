"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireSupplier, requireUser } from "@/lib/auth";
import { asSystem } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { uploadImage } from "@/lib/storage";
import {
  applyAsSupplier, saveSupplierProduct, SupplierError, supplierUpdateFulfillment, updateSupplierProfile,
} from "@/lib/suppliers/portal";
import type { FormState } from "./account";

const str = (form: FormData, k: string) => String(form.get(k) ?? "").trim();
const opt = (v: string) => v || null;
const flat = (e: z.ZodError) => z.flattenError(e).fieldErrors as Record<string, string[] | undefined>;
const phone = z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "رقم الهاتف غير صالح");
const money = z.string().trim().regex(/^\d{1,7}(\.\d{1,3})?$/, "أدخل مبلغًا صحيحًا");

const profile = z.object({
  contactName: z.string().trim().min(2, "اكتب اسم المسؤول").max(80),
  phone,
  whatsapp: z.union([z.literal(""), phone]),
  email: z.union([z.literal(""), z.email("البريد غير صالح")]),
  governorateId: z.union([z.literal(""), z.uuid()]),
  city: z.string().trim().min(2, "اكتب المدينة").max(80),
  categories: z.string().trim().min(2, "ما نوع المنتجات التي توفّرها؟").max(300),
  notes: z.string().trim().max(2000),
});

function readProfile(form: FormData) {
  return profile.safeParse(Object.fromEntries(["contactName", "phone", "whatsapp", "email", "governorateId", "city", "categories", "notes"].map((k) => [k, str(form, k)])));
}

export async function applySupplierAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser("/suppliers/join");
  if (!(await rateLimit("supplier-apply", 5, 60 * 60_000))) return { error: "محاولات كثيرة. حاول لاحقًا." };
  const name = z.string().trim().min(2, "اكتب اسم المتجر أو النشاط").max(120).safeParse(str(form, "name"));
  const p = readProfile(form);
  if (!name.success || !p.success) {
    return { fieldErrors: { ...(p.success ? {} : flat(p.error)), ...(name.success ? {} : { name: name.error.issues.map((i) => i.message) }) } };
  }
  if (str(form, "acceptTerms") !== "on") return { fieldErrors: { acceptTerms: ["يجب الموافقة على شروط الموردين"] } };
  try {
    await asSystem((tx) =>
      applyAsSupplier(tx, user.id, {
        name: name.data, contactName: p.data.contactName, phone: p.data.phone, whatsapp: opt(p.data.whatsapp), email: opt(p.data.email) ?? user.email,
        governorateId: opt(p.data.governorateId), city: p.data.city, categories: p.data.categories, notes: opt(p.data.notes),
      }),
    );
  } catch (e) {
    if (e instanceof SupplierError) return { error: e.message };
    throw e;
  }
  redirect("/supplier?welcome=1");
}

export async function updateSupplierProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const { supplier } = await requireSupplier();
  const p = readProfile(form);
  if (!p.success) return { fieldErrors: flat(p.error) };
  await asSystem((tx) =>
    updateSupplierProfile(tx, supplier.id, {
      contactName: p.data.contactName, phone: p.data.phone, whatsapp: opt(p.data.whatsapp), email: opt(p.data.email),
      governorateId: opt(p.data.governorateId), city: p.data.city, categories: p.data.categories, notes: opt(p.data.notes),
      coverage: opt(str(form, "coverage").slice(0, 300)),
    }),
  );
  refresh();
  return { ok: true, message: "تم حفظ بيانات متجرك." };
}

const product = z.object({
  name: z.string().trim().min(3, "اكتب اسم المنتج").max(160),
  description: z.string().trim().max(5000),
  categoryId: z.union([z.literal(""), z.uuid()]),
  cost: money,
  suggestedPrice: money,
  availability: z.enum(["available", "out_of_stock"]),
  processingDays: z.union([z.literal(""), z.coerce.number().int().min(0).max(30)]),
});

/** "أسود #111111" or "أسود" per line. */
function parseColors(text: string) {
  return text
    .split(/\n|،|,/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((l) => {
      const m = /^(.*?)\s*(#[0-9a-fA-F]{6})?$/.exec(l)!;
      return { name: m[1].trim().slice(0, 40) || l.slice(0, 40), hex: m[2] ?? null };
    });
}

export async function saveSupplierProductAction(_: FormState, form: FormData): Promise<FormState> {
  const { supplier } = await requireSupplier();
  if (!(await rateLimit("supplier-product", 40, 60 * 60_000))) return { error: "محاولات كثيرة. حاول لاحقًا." };
  const p = product.safeParse(Object.fromEntries(["name", "description", "categoryId", "cost", "suggestedPrice", "availability", "processingDays"].map((k) => [k, str(form, k)])));
  if (!p.success) return { fieldErrors: flat(p.error) };
  const id = z.uuid().safeParse(str(form, "id"));

  const kept = form.getAll("keepImage").map(String).filter((u) => /^(https:\/\/|\/media\/)/.test(u)).slice(0, 8);
  const images = kept.map((url) => ({ url, alt: p.data.name }));
  for (const file of form.getAll("upload").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 8)) {
    const up = await uploadImage(file);
    if (!up.ok) return { error: up.error };
    images.push({ url: up.url, alt: p.data.name });
  }
  if (!images.length) return { fieldErrors: { upload: ["أضف صورة واحدة على الأقل للمنتج"] } };

  let productId: string;
  try {
    productId = await asSystem((tx) =>
      saveSupplierProduct(tx, supplier, id.success ? id.data : null, {
        name: p.data.name, description: opt(p.data.description), categoryId: opt(p.data.categoryId),
        cost: p.data.cost, suggestedPrice: p.data.suggestedPrice, availability: p.data.availability,
        processingDays: p.data.processingDays === "" ? null : p.data.processingDays,
        sizes: str(form, "sizes").split(/[,،\s]+/).map((s) => s.trim()).filter(Boolean).slice(0, 20).map((s) => s.slice(0, 12)),
        colors: parseColors(str(form, "colors")),
        images: images.slice(0, 8),
      }),
    );
  } catch (e) {
    if (e instanceof SupplierError) return { error: e.message };
    throw e;
  }
  if (!id.success) redirect(`/supplier/products/${productId}?sent=1`);
  refresh();
  return { ok: true, message: "تم الحفظ وإرساله للمراجعة." };
}

export async function supplierFulfillmentAction(_: FormState, form: FormData): Promise<FormState> {
  const { supplier } = await requireSupplier();
  const id = z.uuid().safeParse(str(form, "id"));
  const status = z.enum(["supplier_accepted", "preparing", "shipped"]).safeParse(str(form, "status"));
  if (!id.success || !status.success) return { error: "طلب غير صالح." };
  try {
    await asSystem((tx) =>
      supplierUpdateFulfillment(tx, supplier, id.data, {
        status: status.data, carrier: opt(str(form, "carrier").slice(0, 80)), tracking: opt(str(form, "tracking").slice(0, 80)),
      }),
    );
  } catch (e) {
    if (e instanceof SupplierError) return { error: e.message };
    throw e;
  }
  refresh();
  return { ok: true, message: "تم التحديث، وأبلغنا فريق المنصة." };
}
