/**
 * Launch readiness: push notification queueing (accounts and guest orders),
 * VAPID key storage, and the owner admin bootstrap.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureAdmin, getDatabase, withContext, type DbContext, type Tx } from "@/lib/db/core";
import { placeOrderTx } from "@/lib/orders/core";
import * as wf from "@/lib/orders/workflow";
import { saveSubscription, vapidKeys } from "@/lib/push/server";

let admin: string;
let customer: string;
let productId: string;
let variantId: string;
let govId: string;

const sys = <T>(fn: (tx: Tx) => Promise<T>) => withContext({ role: "system" }, fn);
const as = <T>(userId: string, fn: (tx: Tx) => Promise<T>) => withContext({ role: "authenticated", userId } as DbContext, fn);
const sub = (n: string) => ({ endpoint: `https://push.example.test/${n}`, keys: { p256dh: "p".repeat(20), auth: "a".repeat(12) } });

async function order(userId: string | null) {
  const r = await sys((tx) =>
    placeOrderTx(tx, {
      items: [{ productId, variantId, quantity: 1 }], customerName: "عميل", phone: "+970599000333", country: "PS",
      governorateId: govId, city: "رام الله", address: "شارع 1", notes: "", paymentMethod: "bank_transfer",
      acceptTerms: true, idempotencyKey: randomUUID(),
    }, userId),
  );
  if (!r.ok) throw new Error(r.error);
  return r.orderId;
}

beforeAll(async () => {
  await sys(async (tx) => {
    const mk = async (email: string) => (await tx.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]))[0].id;
    admin = await mk("admin@test.dev");
    customer = await mk("customer@test.dev");
    await tx.query("update public.profiles set role = 'admin' where id = $1", [admin]);
    [{ id: govId }] = await tx.query<{ id: string }>("select id from public.governorates where name_ar = 'رام الله والبيرة'");
    await tx.query("insert into public.shipping_zones (country_code, currency_code, governorate_id, name_ar, rate, min_days, max_days, is_active) values ('PS','ILS',$1,'رام الله',20,1,3,true)", [govId]);
    const [{ id: s }] = await tx.query<{ id: string }>("insert into public.suppliers (name, agreement_status, ships_to, terms_confirmed_at) values ('مورد', 'approved', '{PS}', now()) returning id");
    [{ id: productId }] = await tx.query<{ id: string }>("insert into public.products (slug, name_ar, price, currency_code) values ('p-1', 'منتج', 50, 'ILS') returning id");
    [{ id: variantId }] = await tx.query<{ id: string }>("insert into public.product_variants (product_id, size) values ($1, 'M') returning id", [productId]);
    await tx.query("insert into public.supplier_products (supplier_id, product_id, cost, currency_code) values ($1, $2, 30, 'ILS')", [s, productId]);
    await tx.query("update public.products set status = 'published' where id = $1", [productId]);
  });
});

afterAll(async () => {
  await (await getDatabase()).close();
});

describe("push notifications", () => {
  it("queue a push for every subscribed device of the account, and for guests following an order", async () => {
    await sys((tx) => saveSubscription(tx, sub("customer-phone"), { userId: customer, orderId: null }, "test"));
    await sys((tx) => saveSubscription(tx, sub("admin-phone"), { userId: admin, orderId: null }, "test"));
    const guestOrder = await order(null);
    await sys((tx) => saveSubscription(tx, sub("guest-phone"), { userId: null, orderId: guestOrder }, "test"));
    const own = await order(customer);

    // A new order notifies admins.
    const forAdmin = await sys((tx) => tx.query<{ title: string }>(
      "select o.title from public.push_outbox o join public.push_subscriptions s on s.id = o.subscription_id where s.endpoint like '%admin-phone'"));
    expect(forAdmin.length).toBeGreaterThanOrEqual(2);

    for (const id of [guestOrder, own]) {
      const items = await sys((tx) => tx.query<{ id: string; unit_price: string }>("select id, unit_price::text from public.order_items where order_id = $1", [id]));
      for (const i of items) await as(admin, (tx) => wf.confirmItemStock(tx, admin, i.id, { stockStatus: "available", unitPrice: i.unit_price, note: null }));
      await as(admin, (tx) => wf.approvePrice(tx, admin, id, { shippingFee: "20", discount: "0", fees: "0", feesLabel: null, expectedShippingCost: "15", validityHours: 48 }));
    }
    const guest = await sys((tx) => tx.query<{ link: string }>(
      "select o.link from public.push_outbox o join public.push_subscriptions s on s.id = o.subscription_id where s.endpoint like '%guest-phone'"));
    expect(guest.length).toBeGreaterThan(0);
    expect(guest[0].link).toMatch(/^\/order\/JM.+\?t=/);
    const mine = await sys((tx) => tx.query<{ link: string }>(
      "select o.link from public.push_outbox o join public.push_subscriptions s on s.id = o.subscription_id where s.endpoint like '%customer-phone'"));
    expect(mine.some((m) => m.link.startsWith("/account/orders/"))).toBe(true);
  });

  it("subscriptions, the outbox and the keys are invisible to customers", async () => {
    await expect(as(customer, (tx) => tx.query("select 1 from public.push_subscriptions"))).rejects.toThrow();
    await expect(as(customer, (tx) => tx.query("select 1 from public.push_outbox"))).rejects.toThrow();
    const k1 = await sys((tx) => vapidKeys(tx));
    expect(k1.publicKey.length).toBeGreaterThan(40);
    await expect(as(customer, (tx) => tx.query("select value from app_meta.secrets"))).rejects.toThrow();
  });
});

describe("owner admin bootstrap", () => {
  it("creates the owner's admin account, but never takes over an account with another password", async () => {
    process.env.ADMIN_EMAIL = "owner@aljamal.test";
    process.env.ADMIN_PASSWORD = "a-strong-owner-password";
    const db = await getDatabase();
    await ensureAdmin(db);
    const [o] = await sys((tx) => tx.query<{ role: string }>("select p.role from public.profiles p join auth.users u on u.id = p.id where u.email = 'owner@aljamal.test'"));
    expect(o.role).toBe("admin");

    await sys((tx) => tx.query("insert into auth.users (email, encrypted_password) values ('claimed@aljamal.test', '$2b$12$abcdefghijklmnopqrstuuJ8m1h0b1V2m3n4o5p6q7r8s9t0u1v2w')"));
    process.env.ADMIN_EMAIL = "claimed@aljamal.test";
    await ensureAdmin(db);
    const [c] = await sys((tx) => tx.query<{ role: string }>("select p.role from public.profiles p join auth.users u on u.id = p.id where u.email = 'claimed@aljamal.test'"));
    expect(c.role).toBe("customer");
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD;
  });
});
