/**
 * Order workflow operations. Each function runs inside the caller's
 * transaction (`tx`) so every change + its history row commit together.
 *
 * Admin functions are called with an admin-scoped transaction (RLS checks
 * is_admin() on every statement). Customer functions are called by the
 * server in system scope ONLY after the caller verified order access.
 * Framework-free on purpose (testable against PGlite).
 */
import type { Tx } from "@/lib/db/core";
import { fromMills, toMills } from "@/lib/money";
import { orderTotal } from "@/lib/finance";
import {
  CUSTOMER_CANCEL_REQUEST, CUSTOMER_FREE_CANCEL, FULFILLMENT_NEEDS_PAYMENT, PRE_APPROVAL, TERMINAL,
  paymentStatusFor, settlementError, transitionError,
} from "./states";

export class WorkflowError extends Error {}
const fail = (msg: string): never => {
  throw new WorkflowError(msg);
};

type OrderRow = {
  id: string; status: string; payment_status: string; currency_code: string; subtotal: string; discount_total: string;
  shipping_cost: string; fees_total: string; total: string; amount_collected: string; price_approved_at: string | null;
  status_before_cancel: string | null; user_id: string | null;
};

export async function lockOrder(tx: Tx, orderId: string): Promise<OrderRow> {
  const [o] = await tx.query<OrderRow>(
    `select id, status, payment_status, currency_code, subtotal::text, discount_total::text, shipping_cost::text, fees_total::text,
            total::text, amount_collected::text, price_approved_at::text, status_before_cancel, user_id
     from public.orders where id = $1 for update`,
    [orderId],
  );
  return o ?? fail("الطلب غير موجود.");
}

export async function logEvent(
  tx: Tx,
  orderId: string,
  e: { from?: string | null; to?: string | null; note?: string | null; visible?: boolean; actorId?: string | null },
) {
  await tx.query(
    `insert into public.order_events (order_id, from_status, status, note, visible_to_customer, actor_id)
     values ($1, $2, $3, $4, $5, $6)`,
    [orderId, e.from ?? null, e.to ?? null, e.note ?? null, e.visible ?? true, e.actorId ?? null],
  );
}

async function setStatus(tx: Tx, o: OrderRow, to: string, note: string | null, actorId: string | null, visible = true) {
  await tx.query("update public.orders set status = $1, status_changed_at = now() where id = $2", [to, o.id]);
  await logEvent(tx, o.id, { from: o.status, to, note, visible, actorId });
  o.status = to;
}

async function audit(tx: Tx, actorId: string, action: string, orderId: string, details: Record<string, unknown> = {}) {
  await tx.query(
    "insert into public.audit_log (actor_id, action, entity, entity_id, details) values ($1, $2, 'order', $3, $4::text::jsonb)",
    [actorId, action, orderId, JSON.stringify(details)],
  );
}

async function moneyState(tx: Tx, orderId: string) {
  const [r] = await tx.query<{ pending_proofs: number; refunds_completed: string; refunds_pending: string }>(
    `select (select count(*)::int from public.payment_proofs where order_id = $1 and status = 'pending') as pending_proofs,
            (select coalesce(sum(amount),0)::text from public.refunds where order_id = $1 and status = 'completed') as refunds_completed,
            (select coalesce(sum(amount),0)::text from public.refunds where order_id = $1 and status = 'pending') as refunds_pending`,
    [orderId],
  );
  return r;
}

async function refreshPaymentStatus(tx: Tx, o: OrderRow) {
  const m = await moneyState(tx, o.id);
  const status = paymentStatusFor({
    collectedMills: toMills(o.amount_collected),
    dueMills: o.price_approved_at ? toMills(o.total) : 0,
    refundedMills: toMills(m.refunds_completed),
    pendingProofs: m.pending_proofs,
  });
  if (status !== o.payment_status) {
    await tx.query("update public.orders set payment_status = $1 where id = $2", [status, o.id]);
    o.payment_status = status;
  }
  return status;
}

// ---------------------------------------------------------------------------
// 1. Review, stock and price approval (admin)
// ---------------------------------------------------------------------------

export async function confirmItemStock(
  tx: Tx,
  adminId: string,
  itemId: string,
  input: { stockStatus: "available" | "unavailable" | "unconfirmed"; unitPrice: string; note: string | null },
) {
  const [item] = await tx.query<{ order_id: string; unit_price: string; quantity: number }>(
    "select order_id, unit_price::text, quantity from public.order_items where id = $1",
    [itemId],
  );
  if (!item) fail("المنتج غير موجود في الطلب.");
  const o = await lockOrder(tx, item.order_id);
  if (!PRE_APPROVAL.includes(o.status)) fail("لتعديل التوفر أو السعر أعد الطلب إلى «بانتظار تأكيد المخزون» أولًا.");
  const line = fromMills(toMills(input.unitPrice) * item.quantity);
  await tx.query(
    `update public.order_items set stock_status = $1, unit_price = $2, line_total = $3, stock_note = $4,
       stock_confirmed_at = case when $1 = 'unconfirmed' then null else now() end,
       stock_confirmed_by = case when $1 = 'unconfirmed' then null else $5::uuid end
     where id = $6`,
    [input.stockStatus, input.unitPrice, line, input.note, adminId, itemId],
  );
  const [{ subtotal }] = await tx.query<{ subtotal: string }>(
    "select coalesce(sum(line_total),0)::text as subtotal from public.order_items where order_id = $1",
    [o.id],
  );
  await tx.query(
    "update public.orders set subtotal = $1, total = $2 where id = $3",
    [subtotal, orderTotal(subtotal, o.discount_total, o.shipping_cost, o.fees_total), o.id],
  );
  if (item.unit_price !== input.unitPrice) {
    await audit(tx, adminId, "item_price_change", o.id, { item: itemId, from: item.unit_price, to: input.unitPrice });
  }
  if (o.status === "new") await setStatus(tx, o, "under_review", null, adminId, true);
}

export async function approvePrice(
  tx: Tx,
  adminId: string,
  orderId: string,
  input: { shippingFee: string; discount: string; fees: string; feesLabel: string | null; expectedShippingCost: string | null; validityHours: number | null },
) {
  const o = await lockOrder(tx, orderId);
  if (!PRE_APPROVAL.includes(o.status)) fail("يمكن اعتماد السعر فقط قبل طلب الدفع.");
  const items = await tx.query<{ stock_status: string }>("select stock_status from public.order_items where order_id = $1", [orderId]);
  if (!items.length || items.some((i) => i.stock_status !== "available")) {
    fail("أكّد توفر كل المنتجات لدى المورد (متوفر) قبل اعتماد السعر.");
  }
  const total = orderTotal(o.subtotal, input.discount, input.shippingFee, input.fees);
  if (toMills(total) <= 0) fail("الإجمالي يجب أن يكون أكبر من صفر.");
  if (toMills(input.discount) > toMills(o.subtotal)) fail("الخصم أكبر من قيمة المنتجات.");
  await tx.query(
    `update public.orders set shipping_cost = $1, discount_total = $2, fees_total = $3, fees_label = $4, total = $5,
       expected_shipping_cost = coalesce($6, expected_shipping_cost), price_approved_at = now(), price_approved_by = $7,
       payment_due_at = case when $8::int is null then null else now() + make_interval(hours => $8::int) end
     where id = $9`,
    [input.shippingFee, input.discount, input.fees, input.feesLabel, total, input.expectedShippingCost, adminId, input.validityHours, orderId],
  );
  o.total = total;
  await audit(tx, adminId, "price_approved", orderId, { total, shipping: input.shippingFee, discount: input.discount, fees: input.fees });
  await setStatus(tx, o, "awaiting_payment", `تم اعتماد السعر النهائي: ${total} ${o.currency_code}. يمكنك الآن التحويل البنكي.`, adminId);
  await refreshPaymentStatus(tx, o);
}

// ---------------------------------------------------------------------------
// 2. Payment proofs and verification
// ---------------------------------------------------------------------------

/** Customer uploads a proof (system scope, access already verified). Never marks the order paid. */
export async function submitPaymentProof(
  tx: Tx,
  orderId: string,
  input: { declaredAmount: string; reference: string | null; note: string | null; file: { mime: string; data: Uint8Array } | null },
) {
  const o = await lockOrder(tx, orderId);
  if (!["awaiting_payment", "payment_review"].includes(o.status)) fail("لا يمكن رفع إثبات دفع لهذا الطلب في حالته الحالية.");
  const [{ n }] = await tx.query<{ n: number }>("select count(*)::int as n from public.payment_proofs where order_id = $1 and status = 'pending'", [orderId]);
  if (n >= 3) fail("لديك إثباتات قيد المراجعة. انتظر مراجعتها قبل رفع المزيد.");
  const [proof] = await tx.query<{ id: string }>(
    `insert into public.payment_proofs (order_id, declared_amount, currency_code, customer_reference, customer_note, has_file, source)
     values ($1, $2, $3, $4, $5, $6, 'customer') returning id`,
    [orderId, input.declaredAmount, o.currency_code, input.reference, input.note, !!input.file],
  );
  if (input.file) {
    await tx.query(
      "insert into public.payment_proof_files (proof_id, mime_type, size_bytes, data) values ($1, $2, $3, $4::bytea)",
      [proof.id, input.file.mime, input.file.data.byteLength, input.file.data],
    );
  }
  if (o.status === "awaiting_payment") {
    await setStatus(tx, o, "payment_review", "استلمنا إثبات التحويل وهو قيد المراجعة. لا يُعتبر الطلب مدفوعًا قبل التحقق من وصول المبلغ.", null);
  } else {
    await logEvent(tx, orderId, { note: "تم رفع إثبات تحويل إضافي.", visible: true });
  }
  await refreshPaymentStatus(tx, o);
  return proof.id;
}

/** Admin verifies (accepts) or rejects a proof. Only accepted money counts as collected. */
export async function reviewPaymentProof(
  tx: Tx,
  adminId: string,
  proofId: string,
  input: { decision: "accept" | "reject"; verifiedAmount?: string; verifiedReference?: string | null; verifiedAt?: string; reason?: string | null },
) {
  const [p] = await tx.query<{ order_id: string; status: string }>("select order_id, status from public.payment_proofs where id = $1", [proofId]);
  if (!p) fail("الإثبات غير موجود.");
  if (p.status !== "pending") fail("تمت مراجعة هذا الإثبات مسبقًا.");
  const o = await lockOrder(tx, p.order_id);
  if (input.decision === "reject") {
    if (!input.reason) fail("اكتب سبب الرفض.");
    await tx.query(
      "update public.payment_proofs set status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = now() where id = $3",
      [input.reason, adminId, proofId],
    );
    await audit(tx, adminId, "payment_proof_rejected", o.id, { proof: proofId, reason: input.reason });
    const m = await moneyState(tx, o.id);
    if (o.status === "payment_review" && m.pending_proofs === 0) {
      await setStatus(tx, o, "awaiting_payment", `تم رفض إثبات التحويل: ${input.reason}`, adminId);
    } else {
      await logEvent(tx, o.id, { note: `تم رفض إثبات تحويل: ${input.reason}`, actorId: adminId });
    }
    await refreshPaymentStatus(tx, o);
    return;
  }
  return acceptMoney(tx, adminId, o, proofId, input.verifiedAmount ?? "", input.verifiedReference ?? null, input.verifiedAt ?? "");
}

/** Admin records money received without a customer proof (e.g. proof sent by WhatsApp). */
export async function recordPayment(
  tx: Tx,
  adminId: string,
  orderId: string,
  input: { amount: string; reference: string | null; verifiedAt: string },
) {
  const o = await lockOrder(tx, orderId);
  const [p] = await tx.query<{ id: string }>(
    `insert into public.payment_proofs (order_id, declared_amount, currency_code, source, customer_note) values ($1, $2, $3, 'admin', 'سُجّل بواسطة الإدارة') returning id`,
    [orderId, input.amount, o.currency_code],
  );
  await acceptMoney(tx, adminId, o, p.id, input.amount, input.reference, input.verifiedAt);
}

async function acceptMoney(tx: Tx, adminId: string, o: OrderRow, proofId: string, amount: string, reference: string | null, verifiedAt: string) {
  if (!o.price_approved_at) fail("اعتمد السعر النهائي قبل تأكيد أي دفعة.");
  if (!["awaiting_payment", "payment_review"].includes(o.status)) fail("لا يمكن تأكيد دفعة لهذا الطلب في حالته الحالية.");
  if (!amount || toMills(amount) <= 0) fail("أدخل المبلغ الذي وصل فعليًا إلى الحساب.");
  if (!verifiedAt) fail("أدخل تاريخ التحقق من وصول المبلغ.");
  await tx.query(
    `update public.payment_proofs set status = 'accepted', verified_amount = $1, verified_reference = $2, verified_at = $3,
       reviewed_by = $4, reviewed_at = now() where id = $5`,
    [amount, reference, verifiedAt, adminId, proofId],
  );
  const collected = fromMills(toMills(o.amount_collected) + toMills(amount));
  await tx.query(
    "update public.orders set amount_collected = $1, payment_reference = coalesce($2, payment_reference) where id = $3",
    [collected, reference, o.id],
  );
  o.amount_collected = collected;
  await audit(tx, adminId, "payment_verified", o.id, { proof: proofId, amount, reference, verified_at: verifiedAt });
  const status = await refreshPaymentStatus(tx, o);
  if (status === "paid") {
    await tx.query("update public.orders set payment_verified_at = $1, payment_verified_by = $2 where id = $3", [verifiedAt, adminId, o.id]);
    // Supplier payables become due once the customer's money is confirmed.
    await tx.query("update public.fulfillment_records set settlement_status = 'due' where order_id = $1 and settlement_status = 'not_due' and status <> 'cancelled'", [o.id]);
    await setStatus(tx, o, "paid", "تم التحقق من وصول المبلغ وتأكيد الدفع.", adminId);
  } else {
    const remaining = fromMills(toMills(o.total) - toMills(collected));
    const m = await moneyState(tx, o.id);
    const note = `تم التحقق من وصول ${amount} ${o.currency_code}. المبلغ المتبقي: ${remaining} ${o.currency_code}.`;
    if (o.status === "payment_review" && m.pending_proofs === 0) await setStatus(tx, o, "awaiting_payment", note, adminId);
    else await logEvent(tx, o.id, { note, actorId: adminId });
  }
}

// ---------------------------------------------------------------------------
// 3. Manual status transitions (admin) with server-side guards
// ---------------------------------------------------------------------------

export async function transitionOrder(tx: Tx, adminId: string, orderId: string, to: string, note: string | null, visible: boolean) {
  const o = await lockOrder(tx, orderId);
  const [items] = await tx.query<{ all_available: boolean }>(
    "select coalesce(bool_and(stock_status = 'available'), false) as all_available from public.order_items where order_id = $1",
    [orderId],
  );
  const fulfillments = await tx.query<{ id: string; status: string; carrier: string | null; tracking_number: string | null; settlement_status: string }>(
    "select id, status, carrier, tracking_number, settlement_status from public.fulfillment_records where order_id = $1 and status <> 'cancelled'",
    [orderId],
  );
  const m = await moneyState(tx, orderId);
  const err = transitionError(o.status, to, {
    paymentStatus: o.payment_status,
    allItemsAvailable: items.all_available,
    activeSettlements: fulfillments.map((f) => ({ status: f.settlement_status })),
    activeFulfillments: fulfillments,
    pendingRefunds: toMills(m.refunds_pending),
    completedRefunds: toMills(m.refunds_completed),
  });
  if (err) fail(err);
  if (to === "awaiting_stock" && o.status === "awaiting_payment") {
    // Re-opening stock/price confirmation withdraws the approved price.
    await tx.query("update public.orders set price_approved_at = null, price_approved_by = null, payment_due_at = null where id = $1", [orderId]);
  }
  if (to === "delivered") {
    // Explicit admin confirmation of delivery (a tracking number alone never means delivered).
    await tx.query(
      "update public.fulfillment_records set status = 'delivered', delivered_at = coalesce(delivered_at, now()) where order_id = $1 and status in ('shipped', 'preparing', 'supplier_accepted', 'sent_to_supplier')",
      [orderId],
    );
  }
  if (to === "returned") {
    await tx.query("update public.fulfillment_records set status = 'returned' where order_id = $1 and status in ('shipped', 'delivered', 'delivery_failed')", [orderId]);
  }
  await setStatus(tx, o, to, note, adminId, visible);
  await audit(tx, adminId, "order_status", orderId, { to });
}

// ---------------------------------------------------------------------------
// 4. Cancellation
// ---------------------------------------------------------------------------

export async function cancelByAdmin(
  tx: Tx,
  adminId: string,
  orderId: string,
  input: { reason: string; costParty: "customer" | "platform" | "supplier" | "none"; nonRefundable: string },
) {
  const o = await lockOrder(tx, orderId);
  if (TERMINAL.includes(o.status) || ["delivered", "returned", "refund_pending"].includes(o.status)) {
    fail("لا يمكن إلغاء الطلب في حالته الحالية. استخدم الإرجاع والاسترداد.");
  }
  if (!input.reason) fail("اكتب سبب الإلغاء.");
  await performCancel(tx, o, adminId, "admin", input.reason, input.costParty, input.nonRefundable);
}

async function performCancel(
  tx: Tx, o: OrderRow, actorId: string | null, by: "customer" | "admin", reason: string,
  costParty: string, nonRefundable: string,
) {
  const collected = toMills(o.amount_collected);
  const keep = Math.min(toMills(nonRefundable), collected);
  await tx.query(
    `update public.orders set cancel_reason = $1, cancelled_by = $2, cancel_cost_party = $3, non_refundable_amount = $4 where id = $5`,
    [reason, by, costParty, fromMills(keep), o.id],
  );
  // Pending proofs are void; supplier work stops; unpaid settlements are cancelled.
  await tx.query("update public.payment_proofs set status = 'rejected', rejection_reason = 'أُلغي الطلب', reviewed_at = now() where order_id = $1 and status = 'pending'", [o.id]);
  await tx.query(
    "update public.fulfillment_records set status = 'cancelled' where order_id = $1 and status in ('awaiting_supplier', 'sent_to_supplier', 'supplier_accepted', 'preparing')",
    [o.id],
  );
  await tx.query("update public.fulfillment_records set settlement_status = 'cancelled' where order_id = $1 and settlement_status in ('not_due', 'due', 'awaiting_transfer')", [o.id]);
  // Supplier already paid → money must come back from the supplier (pending until received).
  await tx.query(
    `update public.fulfillment_records set supplier_refund_status = 'pending', supplier_refund_amount = coalesce(supplier_refund_amount, settlement_paid_amount)
     where order_id = $1 and settlement_status = 'paid' and supplier_refund_status = 'none'`,
    [o.id],
  );
  const refundable = collected - keep;
  if (refundable > 0) {
    await tx.query(
      "insert into public.refunds (order_id, amount, currency_code, reason, status, recorded_by) values ($1, $2, $3, $4, 'pending', $5)",
      [o.id, fromMills(refundable), o.currency_code, `إلغاء الطلب: ${reason}`, actorId],
    );
    await setStatus(tx, o, "refund_pending", `تم إلغاء الطلب (${reason}). سيتم استرداد ${fromMills(refundable)} ${o.currency_code} وسنبلغك عند التنفيذ.`, actorId);
  } else {
    await setStatus(tx, o, "cancelled", `تم إلغاء الطلب: ${reason}`, actorId);
  }
  if (actorId) await audit(tx, actorId, "order_cancelled", o.id, { by, reason, refundable: fromMills(refundable), non_refundable: fromMills(keep) });
}

/** Customer cancellation (system scope after access check). */
export async function customerCancel(tx: Tx, orderId: string, reason: string) {
  const o = await lockOrder(tx, orderId);
  const m = await moneyState(tx, orderId);
  if (CUSTOMER_FREE_CANCEL.includes(o.status) && toMills(o.amount_collected) === 0 && m.pending_proofs === 0) {
    await performCancel(tx, o, null, "customer", reason || "ألغاه العميل قبل الدفع", "none", "0");
    return "cancelled" as const;
  }
  if (CUSTOMER_FREE_CANCEL.includes(o.status) || CUSTOMER_CANCEL_REQUEST.includes(o.status)) {
    await tx.query("update public.orders set status_before_cancel = $1, cancel_reason = $2 where id = $3", [o.status, reason || null, orderId]);
    await setStatus(tx, o, "cancel_requested", `طلب العميل الإلغاء${reason ? `: ${reason}` : ""}. الطلب قيد المراجعة.`, null);
    return "requested" as const;
  }
  return fail("لا يمكن إلغاء الطلب في هذه المرحلة. بعد الشحن استخدم طلب الإرجاع أو تواصل معنا.");
}

export async function decideCancelRequest(
  tx: Tx,
  adminId: string,
  orderId: string,
  input: { approve: boolean; note: string; costParty: "customer" | "platform" | "supplier" | "none"; nonRefundable: string },
) {
  const o = await lockOrder(tx, orderId);
  if (o.status !== "cancel_requested") fail("لا يوجد طلب إلغاء قيد المراجعة.");
  if (input.approve) {
    await performCancel(tx, o, adminId, "customer", input.note || "وافقت الإدارة على طلب الإلغاء", input.costParty, input.nonRefundable);
  } else {
    if (!input.note) fail("اكتب سبب رفض طلب الإلغاء.");
    await setStatus(tx, o, o.status_before_cancel ?? "under_review", `تم رفض طلب الإلغاء: ${input.note}`, adminId);
    await audit(tx, adminId, "cancel_request_rejected", orderId, { note: input.note });
  }
}

// ---------------------------------------------------------------------------
// 5. Refunds & expenses
// ---------------------------------------------------------------------------

export async function createRefund(tx: Tx, adminId: string, orderId: string, input: { amount: string; reason: string; returnRequestId: string | null }) {
  const o = await lockOrder(tx, orderId);
  const m = await moneyState(tx, orderId);
  const available = toMills(o.amount_collected) - toMills(m.refunds_completed) - toMills(m.refunds_pending);
  if (toMills(input.amount) <= 0) fail("أدخل مبلغ استرداد صحيح.");
  if (toMills(input.amount) > available) fail(`لا يمكن استرداد أكثر من المبلغ المحصّل غير المسترد (${fromMills(Math.max(available, 0))} ${o.currency_code}).`);
  if (!input.reason) fail("اكتب سبب الاسترداد.");
  await tx.query(
    "insert into public.refunds (order_id, return_request_id, amount, currency_code, reason, status, recorded_by) values ($1,$2,$3,$4,$5,'pending',$6)",
    [orderId, input.returnRequestId, input.amount, o.currency_code, input.reason, adminId],
  );
  await logEvent(tx, orderId, { note: `تم تسجيل استرداد بقيمة ${input.amount} ${o.currency_code} (قيد التنفيذ).`, actorId: adminId });
  await audit(tx, adminId, "refund_created", orderId, { amount: input.amount, reason: input.reason });
  if (["returned", "delivered", "shipped"].includes(o.status) && o.status !== "refund_pending") {
    // keep status; admin moves to refund_pending explicitly from "returned"
  }
}

/** Marks a refund as actually executed (money sent back outside the platform). */
export async function completeRefund(tx: Tx, adminId: string, refundId: string, input: { method: string | null; reference: string; completedAt: string }) {
  const [r] = await tx.query<{ order_id: string; status: string; amount: string }>("select order_id, status, amount::text from public.refunds where id = $1", [refundId]);
  if (!r) fail("سجل الاسترداد غير موجود.");
  if (r.status !== "pending") fail("هذا الاسترداد ليس معلّقًا.");
  if (!input.reference || !input.completedAt) fail("أدخل مرجع التحويل وتاريخ تنفيذ الاسترداد.");
  const o = await lockOrder(tx, r.order_id);
  await tx.query(
    "update public.refunds set status = 'completed', method = $1, reference = $2, completed_at = $3, recorded_by = $4 where id = $5",
    [input.method, input.reference, input.completedAt, adminId, refundId],
  );
  await audit(tx, adminId, "refund_completed", o.id, { refund: refundId, amount: r.amount, reference: input.reference });
  await refreshPaymentStatus(tx, o);
  const m = await moneyState(tx, o.id);
  if (o.status === "refund_pending" && toMills(m.refunds_pending) === 0) {
    await setStatus(tx, o, "refunded", `تم تنفيذ استرداد ${r.amount} ${o.currency_code}.`, adminId);
  } else {
    await logEvent(tx, o.id, { note: `تم تنفيذ استرداد ${r.amount} ${o.currency_code}.`, actorId: adminId });
  }
}

export async function cancelRefund(tx: Tx, adminId: string, refundId: string, reason: string) {
  const [r] = await tx.query<{ order_id: string; status: string }>("select order_id, status from public.refunds where id = $1", [refundId]);
  if (!r || r.status !== "pending") fail("يمكن إلغاء الاستردادات المعلّقة فقط.");
  if (!reason) fail("اكتب سبب إلغاء الاسترداد.");
  await tx.query("update public.refunds set status = 'cancelled', reference = $1 where id = $2", [reason, refundId]);
  await audit(tx, adminId, "refund_cancelled", r.order_id, { refund: refundId, reason });
}

export async function addExpense(tx: Tx, adminId: string, orderId: string, input: { kind: string; amount: string; note: string | null }) {
  const o = await lockOrder(tx, orderId);
  if (toMills(input.amount) <= 0) fail("أدخل مبلغًا صحيحًا.");
  await tx.query(
    "insert into public.order_expenses (order_id, kind, amount, currency_code, note, recorded_by) values ($1,$2,$3,$4,$5,$6)",
    [orderId, input.kind, input.amount, o.currency_code, input.note, adminId],
  );
  await audit(tx, adminId, "expense_added", orderId, { kind: input.kind, amount: input.amount });
}

// ---------------------------------------------------------------------------
// 6. Fulfillment (shipment) and supplier settlement
// ---------------------------------------------------------------------------

export type FulfillmentInput = {
  supplierId: string | null; status: string; supplierOrderRef: string | null; carrier: string | null; trackingNumber: string | null;
  trackingUrl: string | null; costCurrency: string | null; actualCost: string | null; actualShippingCost: string | null;
  shippingPaidTo: "supplier" | "courier" | "none"; issueReason: string | null; notes: string | null;
  supplierRefundAmount: string | null; supplierRefundStatus: "none" | "pending" | "received";
};

export async function updateFulfillment(tx: Tx, adminId: string, fulfillmentId: string, d: FulfillmentInput) {
  const [f] = await tx.query<{ order_id: string; status: string }>("select order_id, status from public.fulfillment_records where id = $1", [fulfillmentId]);
  if (!f) fail("سجل التنفيذ غير موجود.");
  const o = await lockOrder(tx, f.order_id);
  if (d.status !== f.status && FULFILLMENT_NEEDS_PAYMENT.includes(d.status)) {
    const [items] = await tx.query<{ ok: boolean }>("select coalesce(bool_and(stock_status = 'available'), false) as ok from public.order_items where order_id = $1", [o.id]);
    if (o.payment_status !== "paid" || !items.ok) fail("لا يُرسل الطلب للمورد ولا يُشحن قبل تأكيد الدفع وتوفر المنتجات.");
  }
  if (d.status === "delivery_failed" && !d.issueReason) fail("اكتب سبب فشل التسليم.");
  if ((d.actualCost || d.actualShippingCost) && !d.costCurrency) fail("حدد عملة التكاليف الفعلية.");
  await tx.query(
    `update public.fulfillment_records set supplier_id = $1, status = $2, supplier_order_ref = $3, carrier = $4, tracking_number = $5,
       tracking_url = $6, cost_currency = $7, actual_cost = $8, actual_shipping_cost = $9, shipping_paid_to = $10, issue_reason = $11,
       notes = $12, supplier_refund_amount = $13, supplier_refund_status = $14,
       sent_at = case when $2 = 'sent_to_supplier' and sent_at is null then now() else sent_at end,
       shipped_at = case when $2 = 'shipped' and shipped_at is null then now() else shipped_at end,
       delivered_at = case when $2 = 'delivered' and delivered_at is null then now() else delivered_at end
     where id = $15`,
    [d.supplierId, d.status, d.supplierOrderRef, d.carrier, d.trackingNumber, d.trackingUrl, d.costCurrency, d.actualCost,
      d.actualShippingCost, d.shippingPaidTo, d.issueReason, d.notes, d.supplierRefundAmount, d.supplierRefundStatus, fulfillmentId],
  );
  if (d.status !== f.status) {
    const visibleNotes: Record<string, string> = {
      shipped: `تم شحن طلبك${d.carrier ? ` عبر ${d.carrier}` : ""}.`,
      delivery_failed: `تعذّر التسليم: ${d.issueReason}. سنتواصل معك.`,
    };
    await logEvent(tx, o.id, { note: visibleNotes[d.status] ?? `تحديث التنفيذ لدى المورد: ${d.status}`, visible: d.status in visibleNotes, actorId: adminId });
  }
  await audit(tx, adminId, "fulfillment_update", o.id, { fulfillment: fulfillmentId, from: f.status, to: d.status, actual_cost: d.actualCost, shipping: d.actualShippingCost });
}

export async function updateSettlement(
  tx: Tx,
  adminId: string,
  fulfillmentId: string,
  d: { status: string; paidAmount: string | null; paidAt: string | null; reference: string | null; notes: string | null },
) {
  const [f] = await tx.query<{ order_id: string; settlement_status: string }>("select order_id, settlement_status from public.fulfillment_records where id = $1", [fulfillmentId]);
  if (!f) fail("سجل التنفيذ غير موجود.");
  const o = await lockOrder(tx, f.order_id);
  const err = settlementError({ to: d.status, orderPaymentStatus: o.payment_status, paidAmount: d.paidAmount, paidAt: d.paidAt, reference: d.reference });
  if (err) fail(err);
  await tx.query(
    `update public.fulfillment_records set settlement_status = $1, settlement_paid_amount = $2, settlement_paid_at = $3,
       settlement_reference = $4, settlement_notes = $5, settlement_recorded_by = $6 where id = $7`,
    [d.status, d.status === "paid" ? d.paidAmount : null, d.status === "paid" ? d.paidAt : null, d.reference, d.notes, adminId, fulfillmentId],
  );
  await audit(tx, adminId, "supplier_settlement", o.id, { fulfillment: fulfillmentId, from: f.settlement_status, to: d.status, amount: d.paidAmount, reference: d.reference });
}
