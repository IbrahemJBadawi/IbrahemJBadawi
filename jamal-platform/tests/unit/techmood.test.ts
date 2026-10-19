/**
 * TechMood-derived features (notifications, support tickets, invoices,
 * refund accounts, AI assistant storage) against PGlite with the real
 * migrations and RLS. Demo data only.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabase, withContext, type DbContext, type Tx } from "@/lib/db/core";
import { placeOrderTx } from "@/lib/orders/core";
import * as wf from "@/lib/orders/workflow";
import { createTicket, customerReply, staffReply } from "@/lib/support/tickets";
import { appendExchange, createThread, recordCall, threadMessages, usedLast24h } from "@/lib/ai/store";

let admin: string;
let customer: string;
let other: string;
let productId: string;
let variantId: string;
let govId: string;

const sys = <T>(fn: (tx: Tx) => Promise<T>) => withContext({ role: "system" }, fn);
const as = <T>(userId: string, fn: (tx: Tx) => Promise<T>) => withContext({ role: "authenticated", userId } as DbContext, fn);
const adm = <T>(fn: (tx: Tx) => Promise<T>) => as(admin, fn);
const today = "2026-10-18";

async function paidOrder(userId: string) {
  const r = await sys((tx) =>
    placeOrderTx(tx, {
      items: [{ productId, variantId, quantity: 1 }], customerName: "عميل تجريبي", phone: "+970599000222", country: "PS",
      governorateId: govId, city: "رام الله", address: "شارع تجريبي 1", notes: "", paymentMethod: "bank_transfer",
      acceptTerms: true, idempotencyKey: randomUUID(),
    }, userId),
  );
  if (!r.ok) throw new Error(r.error);
  const items = await sys((tx) => tx.query<{ id: string; unit_price: string }>("select id, unit_price::text from public.order_items where order_id = $1", [r.orderId]));
  for (const i of items) await adm((tx) => wf.confirmItemStock(tx, admin, i.id, { stockStatus: "available", unitPrice: i.unit_price, note: null }));
  await adm((tx) => wf.approvePrice(tx, admin, r.orderId, { shippingFee: "20", discount: "0", fees: "0", feesLabel: null, expectedShippingCost: "15", validityHours: 48 }));
  const [o] = await sys((tx) => tx.query<{ total: string }>("select total::text from public.orders where id = $1", [r.orderId]));
  await adm((tx) => wf.recordPayment(tx, admin, r.orderId, { amount: o.total, reference: "DEMO-REF", verifiedAt: today }));
  return { id: r.orderId, total: o.total };
}

beforeAll(async () => {
  await sys(async (tx) => {
    const mk = async (email: string) => (await tx.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]))[0].id;
    admin = await mk("admin@test.dev");
    customer = await mk("customer@test.dev");
    other = await mk("other@test.dev");
    await tx.query("update public.profiles set role = 'admin' where id = $1", [admin]);
    [{ id: govId }] = await tx.query<{ id: string }>("select id from public.governorates where name_ar = 'رام الله والبيرة'");
    await tx.query(
      `insert into public.shipping_zones (country_code, currency_code, governorate_id, name_ar, rate, estimated_cost, min_days, max_days, is_active)
       values ('PS', 'ILS', $1, 'رام الله', 20, 15, 1, 3, true)`,
      [govId],
    );
    const [{ id: supplierId }] = await tx.query<{ id: string }>(
      "insert into public.suppliers (name, agreement_status, ships_to, terms_confirmed_at) values ('مورد اختبار', 'approved', '{PS}', now()) returning id",
    );
    [{ id: productId }] = await tx.query<{ id: string }>(
      "insert into public.products (slug, name_ar, price, currency_code, status) values ('abaya-test', 'عباية تجريبية', 100, 'ILS', 'draft') returning id",
    );
    [{ id: variantId }] = await tx.query<{ id: string }>("insert into public.product_variants (product_id, size) values ($1, 'M') returning id", [productId]);
    await tx.query("insert into public.supplier_products (supplier_id, product_id, cost, currency_code) values ($1, $2, 60, 'ILS')", [supplierId, productId]);
    await tx.query("update public.products set status = 'published' where id = $1", [productId]);
  });
});

afterAll(async () => {
  await (await getDatabase()).close();
});

describe("notifications", () => {
  it("are created by the database for the customer and admins, and each person sees only their own", async () => {
    const o = await paidOrder(customer);
    const mine = await as(customer, (tx) => tx.query<{ kind: string; user_id: string }>("select kind, user_id from public.notifications"));
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((n) => n.user_id === customer)).toBe(true);
    expect(mine.map((n) => n.kind)).toEqual(expect.arrayContaining(["order_update", "invoice"]));
    const adminKinds = await adm((tx) => tx.query<{ kind: string }>("select kind from public.notifications where user_id = $1", [admin]));
    expect(adminKinds.map((n) => n.kind)).toContain("admin_new_order");
    expect(await as(other, (tx) => tx.query("select 1 from public.notifications"))).toHaveLength(0);
    // Customers cannot create notifications themselves.
    await expect(as(customer, (tx) => tx.query("insert into public.notifications (user_id, kind, title_ar) values ($1, 'order_update', 'x')", [customer]))).rejects.toThrow();
    await expect(as(customer, (tx) => tx.query("select public.notify($1, 'order_update', 'x', null, null, null, null)", [customer]))).rejects.toThrow();
    void o;
  });

  it("respect opt-outs for optional kinds but never for mandatory order updates", async () => {
    await as(other, async (tx) => {
      await tx.query("insert into public.notification_preferences (user_id, kind, in_app, email) values ($1, 'invoice', false, false), ($1, 'order_update', false, false)", [other]);
    });
    await paidOrder(other);
    const kinds = (await as(other, (tx) => tx.query<{ kind: string }>("select kind from public.notifications"))).map((n) => n.kind);
    expect(kinds).toContain("order_update");
    expect(kinds).not.toContain("invoice");
  });
});

describe("support tickets", () => {
  it("guests get a private token; internal staff notes are hidden from the customer", async () => {
    const guest = await sys((tx) => createTicket(tx, { userId: null, guestName: "زائرة", guestPhone: "+970599111222", orderNumber: null, category: "product", subject: "سؤال عن مقاس", body: "هل المقاس M مناسب لطول 165؟" }));
    expect(guest.token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(guest.code).toMatch(/^TK-/);

    const t = await sys((tx) => createTicket(tx, { userId: customer, guestName: null, guestPhone: null, orderNumber: null, category: "delivery", subject: "موعد التوصيل", body: "متى يصل طلبي تقريبًا؟" }));
    expect(t.token).toBeNull();
    await adm((tx) => staffReply(tx, admin, t.id, "ملاحظة داخلية: تواصل مع المورد", true));
    await adm((tx) => staffReply(tx, admin, t.id, "سيصل خلال يومين إن شاء الله", false));
    await sys((tx) => customerReply(tx, t.id, customer, "شكرًا"));

    const seen = await as(customer, (tx) => tx.query<{ body_ar: string }>("select body_ar from public.ticket_messages where ticket_id = $1 order by created_at", [t.id]));
    expect(seen.map((m) => m.body_ar)).toEqual(["متى يصل طلبي تقريبًا؟", "سيصل خلال يومين إن شاء الله", "شكرًا"]);
    expect(await as(other, (tx) => tx.query("select 1 from public.support_tickets where id = $1", [t.id]))).toHaveLength(0);
    // A customer can't post as staff or change ticket status directly.
    await expect(as(customer, (tx) => tx.query("insert into public.ticket_messages (ticket_id, author_kind, author_id, body_ar) values ($1, 'staff', $2, 'x')", [t.id, customer]))).rejects.toThrow();
    const upd = await as(customer, (tx) => tx.query("update public.support_tickets set status = 'closed' where id = $1 returning id", [t.id]));
    expect(upd).toHaveLength(0);
    // The public reply (not the internal note) notified the customer.
    const n = await as(customer, (tx) => tx.query<{ body_ar: string }>("select body_ar from public.notifications where kind = 'ticket_reply'"));
    expect(n.map((x) => x.body_ar)).toEqual(["سيصل خلال يومين إن شاء الله"]);
  });
});

describe("invoices", () => {
  it("are issued once when payment is confirmed, marked on refund, and never deleted", async () => {
    const o = await paidOrder(customer);
    const [inv] = await as(customer, (tx) => tx.query<{ invoice_no: string; total: string; status: string }>("select invoice_no, total::text, status from public.invoices where order_id = $1", [o.id]));
    expect(inv).toMatchObject({ total: o.total, status: "issued" });
    expect(inv.invoice_no).toMatch(/^INV-\d{4}-\d{6}$/);
    expect(await as(other, (tx) => tx.query("select 1 from public.invoices where order_id = $1", [o.id]))).toHaveLength(0);

    await adm((tx) => wf.cancelByAdmin(tx, admin, o.id, { reason: "نفد المقاس لدى المورد", costParty: "platform", nonRefundable: "0" }));
    const [r] = await sys((tx) => tx.query<{ id: string }>("select id from public.refunds where order_id = $1 and status = 'pending'", [o.id]));
    await adm((tx) => wf.completeRefund(tx, admin, r.id, { method: "تحويل بنكي", reference: "DEMO-R1", completedAt: today }));
    const [after] = await sys((tx) => tx.query<{ invoice_no: string; status: string; refunded_amount: string }>("select invoice_no, status, refunded_amount::text from public.invoices where order_id = $1", [o.id]));
    expect(after).toEqual({ invoice_no: inv.invoice_no, status: "refunded", refunded_amount: o.total });

    // Not even an admin can delete or rewrite an invoice.
    await expect(adm((tx) => tx.query("delete from public.invoices where order_id = $1", [o.id]))).rejects.toThrow();
    await expect(adm((tx) => tx.query("update public.invoices set total = 1 where order_id = $1", [o.id]))).rejects.toThrow();
    expect(await sys((tx) => tx.query("select 1 from public.invoices where order_id = $1", [o.id]))).toHaveLength(1);
  });

  it("refund account details are visible to admins only", async () => {
    const o = await paidOrder(customer);
    await sys((tx) => tx.query("insert into public.refund_accounts (order_id, holder_name, method_label, account_ref) values ($1, 'عميل تجريبي', 'محفظة', 'DEMO-0000')", [o.id]));
    expect(await as(customer, (tx) => tx.query("select 1 from public.refund_accounts where order_id = $1", [o.id]))).toHaveLength(0);
    expect(await adm((tx) => tx.query("select 1 from public.refund_accounts where order_id = $1", [o.id]))).toHaveLength(1);
  });
});

describe("AI assistant storage", () => {
  it("threads are private to their owner and the daily quota counts per person or guest key", async () => {
    const thread = await as(customer, async (tx) => {
      const id = await createThread(tx, customer, "سؤال عن عباية");
      await appendExchange(tx, id, "عندكم عبايات؟", "نعم، هذه بعض الخيارات…", "claude-opus-5-5");
      return id;
    });
    const msgs = await as(customer, (tx) => threadMessages(tx, thread));
    expect(msgs.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(await as(other, (tx) => threadMessages(tx, thread))).toHaveLength(0);
    await expect(as(other, (tx) => appendExchange(tx, thread, "x", "y", "m"))).rejects.toThrow();
    await expect(as(other, (tx) => createThread(tx, customer, "انتحال"))).rejects.toThrow();

    await sys(async (tx) => {
      await recordCall(tx, { userId: customer, clientKey: "k1", model: "claude-opus-5-5", inputTokens: 100, outputTokens: 50 });
      await recordCall(tx, { userId: null, clientKey: "guest-a", model: "claude-opus-5-5", inputTokens: 10, outputTokens: 5 });
      await recordCall(tx, { userId: null, clientKey: "guest-a", model: "claude-opus-5-5", inputTokens: 10, outputTokens: 5 });
      expect(await usedLast24h(tx, { userId: customer, clientKey: "ignored" })).toBe(1);
      expect(await usedLast24h(tx, { userId: null, clientKey: "guest-a" })).toBe(2);
      expect(await usedLast24h(tx, { userId: null, clientKey: "guest-b" })).toBe(0);
    });
    // Usage logs are admin-only.
    expect(await as(customer, (tx) => tx.query("select 1 from public.ai_model_calls"))).toHaveLength(0);
  });
});
