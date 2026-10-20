/**
 * Supplier accounts: sign-up, product submission and review, isolation
 * between suppliers, and what a supplier may see of an order.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabase, withContext, type DbContext, type Tx } from "@/lib/db/core";
import { placeOrderTx } from "@/lib/orders/core";
import * as wf from "@/lib/orders/workflow";
import {
  applyAsSupplier, getSupplierProduct, listSupplierOrders, saveSupplierProduct, supplierForUser, supplierUpdateFulfillment,
  type SupplierAccount, type SupplierProductInput,
} from "@/lib/suppliers/portal";

let admin: string;
let reem: string; // supplier account
let other: string; // second supplier account
let govId: string;

const sys = <T>(fn: (tx: Tx) => Promise<T>) => withContext({ role: "system" }, fn);
const as = <T>(userId: string, fn: (tx: Tx) => Promise<T>) => withContext({ role: "authenticated", userId } as DbContext, fn);
const today = "2026-10-19";
const input = (over: Partial<SupplierProductInput> = {}): SupplierProductInput => ({
  name: "عباية كريب", description: "قماش كريب ناعم", categoryId: null, cost: "90", suggestedPrice: "150",
  sizes: ["52", "54"], colors: [{ name: "أسود", hex: "#111111" }], images: [{ url: "/media/00000000-0000-0000-0000-000000000000.jpg" }],
  availability: "available", processingDays: 2, ...over,
});
const apply = (userId: string, name: string) =>
  sys((tx) => applyAsSupplier(tx, userId, { name, contactName: "ريم", phone: "0599000444", whatsapp: null, email: null, governorateId: govId, city: "نابلس", categories: "عبايات", notes: null }));
const account = (userId: string) => sys((tx) => supplierForUser(tx, userId)) as Promise<SupplierAccount>;

beforeAll(async () => {
  await sys(async (tx) => {
    const mk = async (email: string) => (await tx.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]))[0].id;
    admin = await mk("admin@test.dev");
    reem = await mk("reem@shop.test");
    other = await mk("other@shop.test");
    await tx.query("update public.profiles set role = 'admin' where id = $1", [admin]);
    [{ id: govId }] = await tx.query<{ id: string }>("select id from public.governorates where name_ar = 'نابلس'");
  });
});

afterAll(async () => {
  await (await getDatabase()).close();
});

describe("supplier accounts", () => {
  let productId: string;

  it("a customer applies as a supplier: role becomes supplier and admins are notified", async () => {
    await apply(reem, "بوتيك ريم");
    const s = await account(reem);
    expect(s).toMatchObject({ name: "بوتيك ريم", agreement_status: "applied" });
    const [{ role }] = await sys((tx) => tx.query<{ role: string }>("select role from public.profiles where id = $1", [reem]));
    expect(role).toBe("supplier");
    await expect(apply(reem, "مرة ثانية")).rejects.toThrow(/بالفعل/);
    const n = await as(admin, (tx) => tx.query<{ kind: string }>("select kind from public.notifications where user_id = $1", [admin]));
    expect(n.map((x) => x.kind)).toContain("admin_supplier");
    // Users cannot change their own role.
    await as(reem, (tx) => tx.query("update public.profiles set role = 'admin' where id = $1", [reem])).catch(() => undefined);
    const [{ role: still }] = await sys((tx) => tx.query<{ role: string }>("select role from public.profiles where id = $1", [reem]));
    expect(still).toBe("supplier");
  });

  it("submitted products wait for review and cannot go live while the supplier is not approved", async () => {
    const s = await account(reem);
    productId = await sys((tx) => saveSupplierProduct(tx, s, null, input()));
    const p = await sys((tx) => getSupplierProduct(tx, s.id, productId));
    expect(p).toMatchObject({ status: "draft", review_status: "pending", cost: "90.000", price: "150.000" });
    expect(p!.variants).toHaveLength(2);
    // Not visible to shoppers.
    expect(await withContext({ role: "anon" }, (tx) => tx.query("select 1 from public.products where id = $1", [productId]))).toHaveLength(0);
    await expect(as(admin, (tx) => tx.query("update public.products set status = 'published' where id = $1", [productId]))).rejects.toThrow(/مورد أساسي معتمد/);
    await expect(sys((tx) => saveSupplierProduct(tx, s, null, input({ suggestedPrice: "50" })))).rejects.toThrow(/لا يقل/);
  });

  it("another supplier cannot see or edit it", async () => {
    await apply(other, "متجر آخر");
    const o = await account(other);
    expect(await sys((tx) => getSupplierProduct(tx, o.id, productId))).toBeNull();
    await expect(sys((tx) => saveSupplierProduct(tx, o, productId, input({ name: "سرقة" })))).rejects.toThrow(/غير موجود/);
  });

  it("admin asks for changes, then approves the supplier and publishes; the supplier is told each time", async () => {
    await as(admin, (tx) => tx.query("update public.products set review_status = 'changes_requested', review_note = 'صورة أوضح' where id = $1", [productId]));
    const s = await account(reem);
    await sys((tx) => saveSupplierProduct(tx, s, productId, input({ name: "عباية كريب سوداء" })));
    expect(await sys((tx) => getSupplierProduct(tx, s.id, productId))).toMatchObject({ review_status: "pending", review_note: null });

    await as(admin, (tx) => tx.query("update public.suppliers set agreement_status = 'approved', terms_confirmed_at = now() where id = $1", [s.id]));
    await as(admin, (tx) => tx.query("update public.products set price = 165, status = 'published' where id = $1", [productId]));
    const live = await sys((tx) => getSupplierProduct(tx, s.id, productId));
    expect(live).toMatchObject({ status: "published", review_status: "approved", price: "165.000" });
    const notes = await as(reem, (tx) => tx.query<{ title_ar: string }>("select title_ar from public.notifications order by created_at"));
    expect(notes.map((n) => n.title_ar).join(" | ")).toMatch(/مطلوب تعديل.*اعتماد متجرك.*تم نشر منتجك/);

    // Live: content stays, only stock / cost change.
    await sys((tx) => saveSupplierProduct(tx, { ...s, agreement_status: "approved" }, productId, input({ name: "اسم آخر", availability: "out_of_stock", cost: "95" })));
    const after = await sys((tx) => getSupplierProduct(tx, s.id, productId));
    expect(after).toMatchObject({ name_ar: "عباية كريب سوداء", availability: "out_of_stock", cost: "95.000", status: "published" });
  });

  it("orders: delivery details appear only once the order is sent to the supplier, and the supplier moves it forward", async () => {
    const s = await account(reem);
    await sys((tx) => tx.query("update public.products set availability = 'available' where id = $1", [productId]));
    await sys((tx) => tx.query("update public.product_variants set availability = 'available' where product_id = $1", [productId]));
    const [v] = await sys((tx) => tx.query<{ id: string }>("select id from public.product_variants where product_id = $1 limit 1", [productId]));
    const r = await sys((tx) =>
      placeOrderTx(tx, {
        items: [{ productId, variantId: v.id, quantity: 1 }], customerName: "منى", phone: "0599777888", country: "PS", governorateId: govId,
        city: "نابلس", address: "رفيديا", notes: "", paymentMethod: "bank_transfer", acceptTerms: true, idempotencyKey: randomUUID(),
      }, null),
    );
    if (!r.ok) throw new Error(r.error);
    const items = await sys((tx) => tx.query<{ id: string; unit_price: string }>("select id, unit_price::text from public.order_items where order_id = $1", [r.orderId]));
    for (const i of items) await as(admin, (tx) => wf.confirmItemStock(tx, admin, i.id, { stockStatus: "available", unitPrice: i.unit_price, note: null }));
    await as(admin, (tx) => wf.approvePrice(tx, admin, r.orderId, { shippingFee: "25", discount: "0", fees: "0", feesLabel: null, expectedShippingCost: "18", validityHours: 48 }));
    const [o] = await sys((tx) => tx.query<{ total: string }>("select total::text from public.orders where id = $1", [r.orderId]));
    await as(admin, (tx) => wf.recordPayment(tx, admin, r.orderId, { amount: o.total, reference: "DEMO", verifiedAt: today }));
    const [f] = await sys((tx) => tx.query<{ id: string }>("select id from public.fulfillment_records where order_id = $1", [r.orderId]));

    // Not yet sent: nothing listed.
    expect(await sys((tx) => listSupplierOrders(tx, s.id))).toHaveLength(0);
    await sys((tx) => tx.query("update public.fulfillment_records set status = 'sent_to_supplier' where id = $1", [f.id]));
    const [row] = await sys((tx) => listSupplierOrders(tx, s.id));
    expect(row).toMatchObject({ customer_name: "منى", address_line: "رفيديا", items: [expect.objectContaining({ quantity: 1 })] });
    const o2 = await account(other);
    expect(await sys((tx) => listSupplierOrders(tx, o2.id))).toHaveLength(0);

    await expect(sys((tx) => supplierUpdateFulfillment(tx, s, f.id, { status: "shipped", carrier: null, tracking: null }))).rejects.toThrow(/لا يمكن/);
    await sys((tx) => supplierUpdateFulfillment(tx, s, f.id, { status: "supplier_accepted", carrier: null, tracking: null }));
    await expect(sys((tx) => supplierUpdateFulfillment(tx, s, f.id, { status: "shipped", carrier: null, tracking: null }))).rejects.toThrow(/شركة التوصيل/);
    await sys((tx) => supplierUpdateFulfillment(tx, s, f.id, { status: "shipped", carrier: "سريع", tracking: "TRK-1" }));
    await expect(sys((tx) => supplierUpdateFulfillment(tx, o2, f.id, { status: "shipped", carrier: "x", tracking: "y" }))).rejects.toThrow(/غير موجود/);
    // Supplier got a push-worthy notification when the order was sent to them.
    const n = await as(reem, (tx) => tx.query<{ title_ar: string }>("select title_ar from public.notifications where title_ar like 'طلب جديد للتجهيز%'"));
    expect(n).toHaveLength(1);
  });
});
