/**
 * Order-to-cash workflow against a real Postgres engine (PGlite, in memory)
 * with the production migrations and RLS. Demo data only — no real payments.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDatabase, withContext, type DbContext, type Tx } from "@/lib/db/core";
import { placeOrderTx, quoteTx, type CheckoutInput } from "@/lib/orders/core";
import * as wf from "@/lib/orders/workflow";
import { computeFinancials } from "@/lib/finance";

let admin: string;
let customer: string;
let other: string;
let productId: string;
let variantId: string;
let govId: string;
let supplierId: string;

const sys = <T>(fn: (tx: Tx) => Promise<T>) => withContext({ role: "system" }, fn);
const as = <T>(userId: string, fn: (tx: Tx) => Promise<T>) => withContext({ role: "authenticated", userId } as DbContext, fn);
const adm = <T>(fn: (tx: Tx) => Promise<T>) => as(admin, fn);
const today = "2026-10-18";

function checkout(over: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    items: [{ productId, variantId, quantity: 2 }],
    customerName: "عميل تجريبي",
    phone: "+970599000111",
    country: "PS",
    governorateId: govId,
    city: "رام الله",
    address: "شارع الإرسال، بناية 3",
    notes: "",
    paymentMethod: "bank_transfer",
    acceptTerms: true,
    idempotencyKey: randomUUID(),
    ...over,
  };
}

async function newOrder(userId: string | null = customer) {
  const r = await sys((tx) => placeOrderTx(tx, checkout(), userId));
  if (!r.ok) throw new Error(r.error);
  return r.orderId;
}

async function order(id: string) {
  const [o] = await sys((tx) =>
    tx.query<{ status: string; payment_status: string; total: string; amount_collected: string; subtotal: string; shipping_cost: string }>(
      "select status, payment_status, total::text, amount_collected::text, subtotal::text, shipping_cost::text from public.orders where id = $1",
      [id],
    ),
  );
  return o;
}

async function confirmAll(orderId: string) {
  const items = await sys((tx) => tx.query<{ id: string; unit_price: string }>("select id, unit_price::text from public.order_items where order_id = $1", [orderId]));
  for (const i of items) await adm((tx) => wf.confirmItemStock(tx, admin, i.id, { stockStatus: "available", unitPrice: i.unit_price, note: "أكده المورد" }));
}

async function approve(orderId: string) {
  await confirmAll(orderId);
  await adm((tx) => wf.approvePrice(tx, admin, orderId, { shippingFee: "20", discount: "10", fees: "5", feesLabel: "تغليف", expectedShippingCost: "15", validityHours: 48 }));
}

async function pay(orderId: string) {
  await approve(orderId);
  const o = await order(orderId);
  await adm((tx) => wf.recordPayment(tx, admin, orderId, { amount: o.total, reference: "BOP-123", verifiedAt: today }));
}

async function fulfillmentId(orderId: string) {
  const [f] = await sys((tx) => tx.query<{ id: string }>("select id from public.fulfillment_records where order_id = $1", [orderId]));
  return f.id;
}

const ff = (over: Partial<wf.FulfillmentInput> = {}): wf.FulfillmentInput => ({
  supplierId, status: "awaiting_supplier", supplierOrderRef: null, carrier: null, trackingNumber: null, trackingUrl: null,
  costCurrency: "ILS", actualCost: null, actualShippingCost: null, shippingPaidTo: "supplier", issueReason: null, notes: null,
  supplierRefundAmount: null, supplierRefundStatus: "none", ...over,
});

beforeAll(async () => {
  await sys(async (tx) => {
    const mk = async (email: string) => (await tx.query<{ id: string }>("insert into auth.users (email) values ($1) returning id", [email]))[0].id;
    admin = await mk("admin@test.dev");
    customer = await mk("customer@test.dev");
    other = await mk("other@test.dev");
    await tx.query("update public.profiles set role = 'admin' where id = $1", [admin]);
    [{ id: govId }] = await tx.query<{ id: string }>("select id from public.governorates where name_ar = 'رام الله والبيرة'");
    await tx.query("delete from public.shipping_zones where governorate_id = $1", [govId]);
    await tx.query(
      `insert into public.shipping_zones (country_code, currency_code, governorate_id, name_ar, rate, estimated_cost, min_days, max_days, is_active)
       values ('PS', 'ILS', $1, 'رام الله', 20, 15, 1, 3, true)`,
      [govId],
    );
    [{ id: supplierId }] = await tx.query<{ id: string }>(
      "insert into public.suppliers (name, agreement_status, ships_to, terms_confirmed_at) values ('مورد اختبار', 'approved', '{PS}', now()) returning id",
    );
    [{ id: productId }] = await tx.query<{ id: string }>(
      "insert into public.products (slug, name_ar, price, currency_code, status) values ('basic-tee', 'بلوزة قطنية أساسية', 50, 'ILS', 'draft') returning id",
    );
    [{ id: variantId }] = await tx.query<{ id: string }>(
      "insert into public.product_variants (product_id, color_name, size) values ($1, 'أسود', 'M') returning id",
      [productId],
    );
    await tx.query("insert into public.supplier_products (supplier_id, product_id, cost, shipping_cost, currency_code) values ($1, $2, 30, 0, 'ILS')", [supplierId, productId]);
    await tx.query("update public.products set status = 'published' where id = $1", [productId]);
  });
});

afterAll(async () => {
  await (await getDatabase()).close();
});

describe("publishing rules", () => {
  it("refuses to publish a product without an approved supplier, and hides products of a suspended supplier", async () => {
    await expect(sys((tx) => tx.query("insert into public.products (slug, name_ar, price, currency_code, status) values ('x-1', 'x', 1, 'ILS', 'published')"))).rejects.toThrow(/مورد أساسي معتمد/);
    await sys(async (tx) => {
      const [s] = await tx.query<{ id: string }>("insert into public.suppliers (name, agreement_status) values ('مؤقت', 'approved') returning id");
      const [p] = await tx.query<{ id: string }>("insert into public.products (slug, name_ar, price, currency_code) values ('x-2', 'x', 1, 'ILS') returning id");
      await tx.query("insert into public.supplier_products (supplier_id, product_id, cost, currency_code) values ($1, $2, 1, 'ILS')", [s.id, p.id]);
      await tx.query("update public.products set status = 'published' where id = $1", [p.id]);
      await tx.query("update public.suppliers set agreement_status = 'suspended' where id = $1", [s.id]);
      const [after] = await tx.query<{ status: string }>("select status from public.products where id = $1", [p.id]);
      expect(after.status).toBe("hidden");
    });
  });
});

describe("order lifecycle", () => {
  let orderId: string;

  it("1. creates an order with a unique number and server-computed totals", async () => {
    const r = await sys((tx) => placeOrderTx(tx, checkout(), customer));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    orderId = r.orderId;
    expect(r.orderNumber).toMatch(/^JM\d{6}-[A-Z0-9]{6}$/);
    expect(r.accessToken.length).toBeGreaterThan(20);
    const o = await order(orderId);
    expect(o).toMatchObject({ status: "new", payment_status: "unpaid", subtotal: "100.000", shipping_cost: "20.000", total: "120.000" });
  });

  it("2. requires stock confirmation before the price can be approved or paid", async () => {
    await expect(adm((tx) => wf.approvePrice(tx, admin, orderId, { shippingFee: "20", discount: "0", fees: "0", feesLabel: null, expectedShippingCost: null, validityHours: null })))
      .rejects.toThrow(/أكّد توفر كل المنتجات/);
    await expect(sys((tx) => wf.submitPaymentProof(tx, orderId, { declaredAmount: "120", reference: "x", note: null, file: null }))).rejects.toThrow(/لا يمكن رفع إثبات/);
    await expect(adm((tx) => wf.recordPayment(tx, admin, orderId, { amount: "120", reference: "x", verifiedAt: today }))).rejects.toThrow(/اعتمد السعر/);
  });

  it("3. approves the final price (products − discount + delivery + fees) and opens payment", async () => {
    await approve(orderId);
    const o = await order(orderId);
    expect(o.status).toBe("awaiting_payment");
    expect(o.total).toBe("115.000"); // 100 − 10 + 20 + 5
  });

  it("4–5. a proof never means paid; a rejected proof returns the order to awaiting payment", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    await sys((tx) => wf.submitPaymentProof(tx, orderId, { declaredAmount: "115", reference: "TX-1", note: null, file: { mime: "image/png", data: png } }));
    let o = await order(orderId);
    expect(o).toMatchObject({ status: "payment_review", payment_status: "pending_verification", amount_collected: "0.000" });
    const [p] = await sys((tx) => tx.query<{ id: string }>("select id from public.payment_proofs where order_id = $1", [orderId]));
    await expect(adm((tx) => wf.reviewPaymentProof(tx, admin, p.id, { decision: "reject" }))).rejects.toThrow(/سبب الرفض/);
    await adm((tx) => wf.reviewPaymentProof(tx, admin, p.id, { decision: "reject", reason: "المبلغ غير ظاهر في كشف الحساب" }));
    o = await order(orderId);
    expect(o).toMatchObject({ status: "awaiting_payment", payment_status: "unpaid" });
  });

  it("6. admin confirms money actually received → paid, supplier payable becomes due", async () => {
    await sys((tx) => wf.submitPaymentProof(tx, orderId, { declaredAmount: "115", reference: "TX-2", note: null, file: null }));
    const [p] = await sys((tx) => tx.query<{ id: string }>("select id from public.payment_proofs where order_id = $1 and status = 'pending'", [orderId]));
    // Partial money first: stays unpaid-for-fulfillment
    await adm((tx) => wf.reviewPaymentProof(tx, admin, p.id, { decision: "accept", verifiedAmount: "100", verifiedAt: today, verifiedReference: "BOP-1" }));
    let o = await order(orderId);
    expect(o).toMatchObject({ status: "awaiting_payment", payment_status: "pending_verification", amount_collected: "100.000" });
    await adm((tx) => wf.recordPayment(tx, admin, orderId, { amount: "15", reference: "BOP-2", verifiedAt: today }));
    o = await order(orderId);
    expect(o).toMatchObject({ status: "paid", payment_status: "paid", amount_collected: "115.000" });
    const [f] = await sys((tx) => tx.query<{ settlement_status: string }>("select settlement_status from public.fulfillment_records where order_id = $1", [orderId]));
    expect(f.settlement_status).toBe("due");
  });

  it("8–9. supplier settlement needs explicit amount, date and reference to be marked paid", async () => {
    const fid = await fulfillmentId(orderId);
    await expect(adm((tx) => wf.updateSettlement(tx, admin, fid, { status: "paid", paidAmount: null, paidAt: null, reference: null, notes: null }))).rejects.toThrow(/المبلغ المحوّل/);
    await adm((tx) => wf.updateSettlement(tx, admin, fid, { status: "awaiting_transfer", paidAmount: null, paidAt: null, reference: null, notes: null }));
    await adm((tx) => wf.updateSettlement(tx, admin, fid, { status: "paid", paidAmount: "60", paidAt: today, reference: "SUP-1", notes: null }));
    await adm((tx) => wf.transitionOrder(tx, admin, orderId, "awaiting_supplier_payout", null, false));
    await adm((tx) => wf.transitionOrder(tx, admin, orderId, "supplier_paid", null, false));
    expect((await order(orderId)).status).toBe("supplier_paid");
  });

  it("10–12. sent to supplier, tracking recorded (not delivered), then explicit delivery confirmation", async () => {
    const fid = await fulfillmentId(orderId);
    await adm((tx) => wf.updateFulfillment(tx, admin, fid, ff({ status: "sent_to_supplier" })));
    await adm((tx) => wf.transitionOrder(tx, admin, orderId, "processing", null, true));
    await expect(adm((tx) => wf.transitionOrder(tx, admin, orderId, "shipped", null, true))).rejects.toThrow(/رقم التتبع/);
    await adm((tx) => wf.updateFulfillment(tx, admin, fid, ff({ status: "shipped", carrier: "شركة توصيل", trackingNumber: "TRK-9", actualCost: "60", actualShippingCost: "15" })));
    await adm((tx) => wf.transitionOrder(tx, admin, orderId, "shipped", null, true));
    expect((await order(orderId)).status).toBe("shipped"); // a tracking number is not delivery
    await adm((tx) => wf.transitionOrder(tx, admin, orderId, "delivered", "تم التسليم واستلام تأكيد العميل", true));
    expect((await order(orderId)).status).toBe("delivered");
    const [f] = await sys((tx) => tx.query<{ status: string; delivered_at: string | null }>("select status, delivered_at::text from public.fulfillment_records where id = $1", [fid]));
    expect(f.status).toBe("delivered");
    expect(f.delivered_at).not.toBeNull();
  });

  it("13. computes the actual profit from recorded money and costs", async () => {
    await adm((tx) => wf.addExpense(tx, admin, orderId, { kind: "transfer_fee", amount: "2", note: null }));
    const fin = await sys(async (tx) => {
      const [o] = await tx.query<{ subtotal: string; discount_total: string; shipping_cost: string; fees_total: string; total: string; amount_collected: string; expected_shipping_cost: string }>(
        "select subtotal::text, discount_total::text, shipping_cost::text, fees_total::text, total::text, amount_collected::text, expected_shipping_cost::text from public.orders where id = $1",
        [orderId],
      );
      const fs = await tx.query<{ status: string; cost_currency: string; expected_cost: string; actual_cost: string; actual_shipping_cost: string; shipping_paid_to: "supplier"; settlement_status: string; settlement_paid_amount: string }>(
        "select status, cost_currency, expected_cost::text, actual_cost::text, actual_shipping_cost::text, shipping_paid_to, settlement_status, settlement_paid_amount::text from public.fulfillment_records where order_id = $1",
        [orderId],
      );
      const ex = await tx.query<{ kind: string; amount: string }>("select kind, amount::text from public.order_expenses where order_id = $1", [orderId]);
      return computeFinancials(
        { currency: "ILS", subtotal: o.subtotal, discount: o.discount_total, shippingFee: o.shipping_cost, fees: o.fees_total, total: o.total, amountCollected: o.amount_collected, expectedShippingCost: o.expected_shipping_cost },
        fs.map((f) => ({ status: f.status, costCurrency: f.cost_currency, expectedCost: f.expected_cost, actualCost: f.actual_cost, actualShippingCost: f.actual_shipping_cost, shippingPaidTo: f.shipping_paid_to, settlementStatus: f.settlement_status, settlementPaidAmount: f.settlement_paid_amount, supplierRefundAmount: null, supplierRefundStatus: "none" })),
        ex.map((e) => ({ kind: e.kind, amount: e.amount, currency: "ILS" })),
        [],
      );
    });
    // collected 115 − products 60 − delivery 15 − transfer fee 2 = 38
    expect(fin.actualProfit).toBe("38.000");
    // expected: 115 − supplier snapshot (2 × 30) − estimated delivery 15 = 40
    expect(fin.expectedProfit).toBe("40.000");
    expect(fin.supplierTransferred).toBe("60.000");
  });
});

describe("cancellation and refunds", () => {
  it("14–15. cancelling a paid order creates a pending refund; partial then full refund", async () => {
    const id = await newOrder();
    await pay(id);
    await adm((tx) => wf.cancelByAdmin(tx, admin, id, { reason: "المورد أبلغ بنفاد المقاس", costParty: "platform", nonRefundable: "0" }));
    let o = await order(id);
    expect(o.status).toBe("refund_pending");
    const refunds = await sys((tx) => tx.query<{ id: string; amount: string; status: string }>("select id, amount::text, status from public.refunds where order_id = $1", [id]));
    expect(refunds).toEqual([expect.objectContaining({ amount: "115.000", status: "pending" })]);
    // Completing needs a real reference/date
    await expect(adm((tx) => wf.completeRefund(tx, admin, refunds[0].id, { method: null, reference: "", completedAt: today }))).rejects.toThrow(/مرجع/);
    // Replace with partial + remainder to exercise both states
    await adm((tx) => wf.cancelRefund(tx, admin, refunds[0].id, "تقسيم الاسترداد على دفعتين"));
    await adm((tx) => wf.createRefund(tx, admin, id, { amount: "50", reason: "دفعة أولى", returnRequestId: null }));
    await adm((tx) => wf.createRefund(tx, admin, id, { amount: "65", reason: "دفعة ثانية", returnRequestId: null }));
    await expect(adm((tx) => wf.createRefund(tx, admin, id, { amount: "1", reason: "زيادة", returnRequestId: null }))).rejects.toThrow(/لا يمكن استرداد أكثر/);
    const pend = await sys((tx) => tx.query<{ id: string; amount: string }>("select id, amount::text from public.refunds where order_id = $1 and status = 'pending' order by amount", [id]));
    await adm((tx) => wf.completeRefund(tx, admin, pend[0].id, { method: "تحويل بنكي", reference: "R-1", completedAt: today }));
    o = await order(id);
    expect(o).toMatchObject({ status: "refund_pending", payment_status: "partially_refunded" });
    await adm((tx) => wf.completeRefund(tx, admin, pend[1].id, { method: "تحويل بنكي", reference: "R-2", completedAt: today }));
    o = await order(id);
    expect(o).toMatchObject({ status: "refunded", payment_status: "refunded" });
  });

  it("customer cancels freely before paying, but only requests cancellation after paying", async () => {
    const a = await newOrder();
    expect(await sys((tx) => wf.customerCancel(tx, a, "غيّرت رأيي"))).toBe("cancelled");
    expect((await order(a)).status).toBe("cancelled");
    const b = await newOrder();
    await pay(b);
    expect(await sys((tx) => wf.customerCancel(tx, b, "تأخر"))).toBe("requested");
    expect((await order(b)).status).toBe("cancel_requested");
    await adm((tx) => wf.decideCancelRequest(tx, admin, b, { approve: false, note: "الطلب شُحن من المورد", costParty: "none", nonRefundable: "0" }));
    expect((await order(b)).status).toBe("paid");
  });

  it("does not send to the supplier before payment and stock are confirmed", async () => {
    const id = await newOrder();
    const fid = await fulfillmentId(id);
    await expect(adm((tx) => wf.updateFulfillment(tx, admin, fid, ff({ status: "sent_to_supplier" })))).rejects.toThrow(/قبل تأكيد الدفع/);
    await approve(id);
    await expect(adm((tx) => wf.transitionOrder(tx, admin, id, "processing", null, true))).rejects.toThrow();
  });
});

describe("security and robustness", () => {
  it("7. customers cannot change payment status, create proofs directly, or read proof files and bank settings", async () => {
    const id = await newOrder();
    const upd = await as(customer, (tx) => tx.query("update public.orders set payment_status = 'paid', status = 'paid' where id = $1 returning id", [id]));
    expect(upd).toHaveLength(0);
    await expect(as(customer, (tx) => tx.query("insert into public.payment_proofs (order_id, declared_amount, currency_code, status) values ($1, 1, 'ILS', 'accepted')", [id]))).rejects.toThrow(/row-level security/);
    expect(await as(customer, (tx) => tx.query("select * from public.payment_proof_files"))).toHaveLength(0);
    expect(await as(customer, (tx) => tx.query("select * from public.payment_settings"))).toHaveLength(0);
    await expect(withContext({ role: "anon" }, (tx) => tx.query("select * from public.payment_settings"))).rejects.toThrow(/permission denied/);
    expect((await order(id)).payment_status).toBe("unpaid");
  });

  it("17. customers cannot run admin operations or see other customers' orders", async () => {
    const id = await newOrder(customer);
    await expect(as(other, (tx) => wf.transitionOrder(tx, other, id, "under_review", null, true))).rejects.toThrow(/غير موجود/);
    await expect(as(customer, (tx) => wf.recordPayment(tx, customer, id, { amount: "1", reference: "x", verifiedAt: today }))).rejects.toThrow();
    expect(await as(other, (tx) => tx.query("select id from public.orders where id = $1", [id]))).toHaveLength(0);
    expect(await as(other, (tx) => tx.query("select * from public.refunds"))).toHaveLength(0);
    expect(await as(customer, (tx) => tx.query("select * from public.order_expenses"))).toHaveLength(0);
  });

  it("16. the same checkout submitted twice creates one order", async () => {
    const input = checkout();
    const a = await sys((tx) => placeOrderTx(tx, input, customer));
    const b = await sys((tx) => placeOrderTx(tx, input, customer));
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(b.orderId).toBe(a.orderId);
      expect(b.duplicate).toBe(true);
    }
    const [{ n }] = await sys((tx) => tx.query<{ n: number }>("select count(*)::int as n from public.orders where idempotency_key = $1", [input.idempotencyKey]));
    expect(n).toBe(1);
  });

  it("19. a database failure while saving leaves no partial order", async () => {
    const input = checkout();
    await expect(
      sys((tx) => {
        const failing: Tx = {
          exec: tx.exec,
          query: (text, params) => (text.includes("insert into public.order_item_costs") ? Promise.reject(new Error("simulated failure")) : tx.query(text, params)),
        };
        return placeOrderTx(failing, input, customer);
      }),
    ).rejects.toThrow("simulated failure");
    const [{ n }] = await sys((tx) => tx.query<{ n: number }>("select count(*)::int as n from public.orders where idempotency_key = $1", [input.idempotencyKey]));
    expect(n).toBe(0);
    // Retrying with the same key now succeeds once.
    const ok = await sys((tx) => placeOrderTx(tx, input, customer));
    expect(ok.ok).toBe(true);
  });

  it("ignores any price sent by the browser (prices come from the database)", async () => {
    const tampered = { ...checkout(), unitPrice: "0.01", total: "1" } as unknown as CheckoutInput;
    const r = await sys((tx) => placeOrderTx(tx, tampered, null));
    if (!r.ok) throw new Error(r.error);
    expect((await order(r.orderId)).subtotal).toBe("100.000");
  });

  it("delivers to Gaza with the fee confirmed alongside the final price, and refuses switched-off areas", async () => {
    const [{ id: gaza }] = await sys((tx) => tx.query<{ id: string }>("select id from public.governorates where name_ar = 'غزة'"));
    const q = await sys((tx) => quoteTx(tx, checkout().items, "PS", gaza));
    expect(q).toMatchObject({ ok: true, shipping: "0.000", shippingToConfirm: true });
    const r = await sys((tx) => placeOrderTx(tx, checkout({ governorateId: gaza }), null));
    expect(r.ok).toBe(true);
    // Setting a real fee clears the "to confirm" flag.
    await sys((tx) => tx.query("update public.shipping_zones set rate = 35 where governorate_id = $1", [gaza]));
    expect(await sys((tx) => quoteTx(tx, checkout().items, "PS", gaza))).toMatchObject({ shipping: "35.000", shippingToConfirm: false });
    await sys((tx) => tx.query("update public.shipping_zones set is_active = false where governorate_id = $1", [gaza]));
    const off = await sys((tx) => placeOrderTx(tx, checkout({ governorateId: gaza }), null));
    expect(off.ok).toBe(false);
  });
});

describe("20. delivery is never counted twice", () => {
  const base = { currency: "ILS", subtotal: "100", discount: "0", shippingFee: "20", fees: "0", total: "120", amountCollected: "120", expectedShippingCost: "15" };
  const f = (to: "supplier" | "courier") => ({
    status: "delivered", costCurrency: "ILS", expectedCost: "60", actualCost: "60", actualShippingCost: "15", shippingPaidTo: to,
    settlementStatus: "paid", settlementPaidAmount: to === "supplier" ? "75" : "60", supplierRefundAmount: null, supplierRefundStatus: "none",
  });
  it("revenue includes the customer's delivery fee once; cost includes actual delivery once, whoever is paid", () => {
    const viaSupplier = computeFinancials(base, [f("supplier")], [], []);
    const viaCourier = computeFinancials(base, [f("courier")], [], []);
    expect(viaSupplier.expectedRevenue).toBe("120.000"); // 100 + 20 delivery fee, once
    expect(viaSupplier.actualProfit).toBe("45.000"); // 120 − 60 − 15
    expect(viaCourier.actualProfit).toBe("45.000");
    expect(viaSupplier.supplierDue).toBe("75.000"); // supplier collects delivery cost too
    expect(viaCourier.supplierDue).toBe("60.000");
  });
});
