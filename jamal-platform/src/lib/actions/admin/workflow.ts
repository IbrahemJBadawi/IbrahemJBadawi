"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { withAdmin } from "@/lib/admin";
import { currency, dbError, f, fieldErrors, money, optMoney, optUrl } from "@/lib/admin/form";
import {
  addExpense, approvePrice, cancelByAdmin, cancelRefund, completeRefund, confirmItemStock, createRefund,
  decideCancelRequest, recordPayment, reviewPaymentProof, transitionOrder, updateFulfillment, updateSettlement, WorkflowError,
} from "@/lib/orders/workflow";
import { ORDER_STATUSES, FULFILLMENT_STATUSES, SETTLEMENT_STATUSES } from "@/lib/orders/states";
import type { ActionResult } from "@/components/forms/ActionForm";

type AdminTx = Parameters<Parameters<typeof withAdmin>[0]>;

async function run(fn: (...a: AdminTx) => Promise<unknown>, message: string): Promise<ActionResult> {
  try {
    await withAdmin(fn);
  } catch (e) {
    if (e instanceof WorkflowError) return { error: e.message };
    return { error: dbError(e) };
  }
  refresh();
  return { ok: true, message };
}

const uuid = z.uuid();
const party = z.enum(["customer", "platform", "supplier", "none"]);
const dateTime = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/, "تاريخ غير صالح");
const zero = (v: string) => v || "0";

export async function confirmStockAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({ itemId: uuid, stockStatus: z.enum(["available", "unavailable", "unconfirmed"]), unitPrice: money, note: z.string().trim().max(500) })
    .safeParse({ itemId: f.str(form, "itemId"), stockStatus: f.str(form, "stockStatus"), unitPrice: f.str(form, "unitPrice"), note: f.str(form, "note") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  return run((tx, admin) => confirmItemStock(tx, admin.id, p.data.itemId, { stockStatus: p.data.stockStatus, unitPrice: p.data.unitPrice, note: p.data.note || null }), "تم حفظ حالة التوفر.");
}

export async function approvePriceAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      orderId: uuid, shippingFee: money, discount: money, fees: money, feesLabel: z.string().trim().max(80),
      expectedShippingCost: optMoney, validityHours: z.union([z.literal(""), z.coerce.number().int().min(1).max(720)]),
    })
    .safeParse({
      orderId: f.str(form, "orderId"), shippingFee: zero(f.str(form, "shippingFee")), discount: zero(f.str(form, "discount")),
      fees: zero(f.str(form, "fees")), feesLabel: f.str(form, "feesLabel"), expectedShippingCost: f.str(form, "expectedShippingCost"),
      validityHours: f.str(form, "validityHours"),
    });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  if (Number(d.fees) > 0 && !d.feesLabel) return { error: "اكتب اسم الرسوم المعلنة ليظهر للعميل." };
  return run(
    (tx, admin) => approvePrice(tx, admin.id, d.orderId, {
      shippingFee: d.shippingFee, discount: d.discount, fees: d.fees, feesLabel: d.feesLabel || null,
      expectedShippingCost: d.expectedShippingCost, validityHours: d.validityHours === "" ? null : d.validityHours,
    }),
    "تم اعتماد السعر النهائي وأصبحت تعليمات التحويل ظاهرة للعميل.",
  );
}

export async function reviewProofAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const proofId = uuid.safeParse(f.str(form, "proofId"));
  const decision = f.str(form, "decision");
  if (!proofId.success || !["accept", "reject"].includes(decision)) return { error: "طلب غير صالح." };
  if (decision === "reject") {
    return run((tx, admin) => reviewPaymentProof(tx, admin.id, proofId.data, { decision: "reject", reason: f.str(form, "reason") || null }), "تم رفض الإثبات وإبلاغ العميل بالسبب.");
  }
  const p = z.object({ amount: money, verifiedAt: dateTime, reference: z.string().trim().max(120) })
    .safeParse({ amount: f.str(form, "verifiedAmount"), verifiedAt: f.str(form, "verifiedAt"), reference: f.str(form, "verifiedReference") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  if (!f.bool(form, "confirmReceived")) return { error: "أكّد أنك تحققت من وصول المبلغ فعليًا إلى الحساب البنكي." };
  return run(
    (tx, admin) => reviewPaymentProof(tx, admin.id, proofId.data, { decision: "accept", verifiedAmount: p.data.amount, verifiedAt: p.data.verifiedAt, verifiedReference: p.data.reference || null }),
    "تم تسجيل الدفعة المؤكدة.",
  );
}

export async function recordPaymentAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ orderId: uuid, amount: money, verifiedAt: dateTime, reference: z.string().trim().max(120) })
    .safeParse({ orderId: f.str(form, "orderId"), amount: f.str(form, "amount"), verifiedAt: f.str(form, "verifiedAt"), reference: f.str(form, "reference") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  if (!f.bool(form, "confirmReceived")) return { error: "أكّد أنك تحققت من وصول المبلغ فعليًا إلى الحساب البنكي." };
  return run((tx, admin) => recordPayment(tx, admin.id, p.data.orderId, { amount: p.data.amount, reference: p.data.reference || null, verifiedAt: p.data.verifiedAt }), "تم تسجيل الدفعة المؤكدة.");
}

export async function transitionAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ orderId: uuid, to: z.enum(ORDER_STATUSES), note: z.string().trim().max(500) })
    .safeParse({ orderId: f.str(form, "orderId"), to: f.str(form, "to"), note: f.str(form, "note") });
  if (!p.success) return { error: "اختر حالة صالحة." };
  return run((tx, admin) => transitionOrder(tx, admin.id, p.data.orderId, p.data.to, p.data.note || null, f.bool(form, "visible")), "تم تحديث حالة الطلب.");
}

export async function cancelOrderAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ orderId: uuid, reason: z.string().trim().min(3, "اكتب سبب الإلغاء").max(500), costParty: party, nonRefundable: money })
    .safeParse({ orderId: f.str(form, "orderId"), reason: f.str(form, "reason"), costParty: f.str(form, "costParty") || "none", nonRefundable: zero(f.str(form, "nonRefundable")) });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  return run((tx, admin) => cancelByAdmin(tx, admin.id, p.data.orderId, p.data), "تم إلغاء الطلب.");
}

export async function decideCancelAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ orderId: uuid, approve: z.enum(["yes", "no"]), note: z.string().trim().max(500), costParty: party, nonRefundable: money })
    .safeParse({ orderId: f.str(form, "orderId"), approve: f.str(form, "approve"), note: f.str(form, "note"), costParty: f.str(form, "costParty") || "none", nonRefundable: zero(f.str(form, "nonRefundable")) });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  return run((tx, admin) => decideCancelRequest(tx, admin.id, d.orderId, { approve: d.approve === "yes", note: d.note, costParty: d.costParty, nonRefundable: d.nonRefundable }), "تم حفظ القرار.");
}

export async function updateFulfillmentAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      id: uuid,
      supplierId: z.union([z.literal(""), uuid]).transform((v) => v || null),
      status: z.enum(FULFILLMENT_STATUSES),
      supplierOrderRef: z.string().trim().max(120).transform((v) => v || null),
      carrier: z.string().trim().max(80).transform((v) => v || null),
      trackingNumber: z.string().trim().max(120).transform((v) => v || null),
      trackingUrl: optUrl,
      costCurrency: z.union([z.literal(""), currency]).transform((v) => v || null),
      actualCost: optMoney,
      actualShippingCost: optMoney,
      shippingPaidTo: z.enum(["supplier", "courier", "none"]),
      issueReason: z.string().trim().max(500).transform((v) => v || null),
      notes: z.string().trim().max(2000).transform((v) => v || null),
      supplierRefundAmount: optMoney,
      supplierRefundStatus: z.enum(["none", "pending", "received"]),
    })
    .safeParse(Object.fromEntries(
      ["id", "supplierId", "status", "supplierOrderRef", "carrier", "trackingNumber", "trackingUrl", "costCurrency", "actualCost",
        "actualShippingCost", "shippingPaidTo", "issueReason", "notes", "supplierRefundAmount", "supplierRefundStatus"].map((k) => [k, f.str(form, k)]),
    ));
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const { id, ...d } = p.data;
  return run((tx, admin) => updateFulfillment(tx, admin.id, id, d), "تم حفظ سجل التنفيذ والشحن.");
}

export async function updateSettlementAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      id: uuid,
      status: z.enum(SETTLEMENT_STATUSES),
      paidAmount: optMoney,
      paidAt: z.union([z.literal(""), dateTime]).transform((v) => v || null),
      reference: z.string().trim().max(120).transform((v) => v || null),
      notes: z.string().trim().max(1000).transform((v) => v || null),
    })
    .safeParse({ id: f.str(form, "id"), status: f.str(form, "status"), paidAmount: f.str(form, "paidAmount"), paidAt: f.str(form, "paidAt"), reference: f.str(form, "reference"), notes: f.str(form, "notes") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const { id, ...d } = p.data;
  return run((tx, admin) => updateSettlement(tx, admin.id, id, d), "تم حفظ تسوية المورد.");
}

export async function createRefundAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ orderId: uuid, amount: money, reason: z.string().trim().min(3, "اكتب السبب").max(500), returnRequestId: z.union([z.literal(""), uuid]).transform((v) => v || null) })
    .safeParse({ orderId: f.str(form, "orderId"), amount: f.str(form, "amount"), reason: f.str(form, "reason"), returnRequestId: f.str(form, "returnRequestId") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  return run((tx, admin) => createRefund(tx, admin.id, p.data.orderId, p.data), "تم تسجيل الاسترداد كمعلّق حتى تنفيذه فعليًا.");
}

export async function completeRefundAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ refundId: uuid, reference: z.string().trim().min(1, "أدخل المرجع").max(120), completedAt: dateTime, method: z.string().trim().max(80) })
    .safeParse({ refundId: f.str(form, "refundId"), reference: f.str(form, "reference"), completedAt: f.str(form, "completedAt"), method: f.str(form, "method") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  return run((tx, admin) => completeRefund(tx, admin.id, p.data.refundId, { method: p.data.method || null, reference: p.data.reference, completedAt: p.data.completedAt }), "تم تسجيل تنفيذ الاسترداد.");
}

export async function cancelRefundAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(f.str(form, "refundId"));
  if (!id.success) return { error: "طلب غير صالح." };
  return run((tx, admin) => cancelRefund(tx, admin.id, id.data, f.str(form, "reason")), "تم إلغاء سجل الاسترداد.");
}

export async function addExpenseAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z.object({ orderId: uuid, kind: z.enum(["payment_fee", "transfer_fee", "return_cost", "other"]), amount: money, note: z.string().trim().max(300) })
    .safeParse({ orderId: f.str(form, "orderId"), kind: f.str(form, "kind"), amount: f.str(form, "amount"), note: f.str(form, "note") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  return run((tx, admin) => addExpense(tx, admin.id, p.data.orderId, { kind: p.data.kind, amount: p.data.amount, note: p.data.note || null }), "تم تسجيل المصروف.");
}

export async function updateReturnAction(_: ActionResult, form: FormData): Promise<ActionResult> {
  const p = z
    .object({
      id: uuid,
      status: z.enum(["requested", "approved", "rejected", "received", "refunded", "exchanged", "closed"]),
      costParty: z.union([z.literal(""), party]).transform((v) => v || null),
      adminNotes: z.string().trim().max(2000).transform((v) => v || null),
    })
    .safeParse({ id: f.str(form, "id"), status: f.str(form, "status"), costParty: f.str(form, "costParty"), adminNotes: f.str(form, "adminNotes") });
  if (!p.success) return { fieldErrors: fieldErrors(p.error) };
  const d = p.data;
  return run(async (tx, admin) => {
    const [r] = await tx.query<{ order_id: string }>("update public.return_requests set status=$1, cost_party=$2, admin_notes=$3 where id=$4 returning order_id", [d.status, d.costParty, d.adminNotes, d.id]);
    if (!r) throw new WorkflowError("طلب الإرجاع غير موجود.");
    const labels: Record<string, string> = { approved: "تمت الموافقة على طلب الإرجاع/الاستبدال", rejected: "تم رفض طلب الإرجاع", received: "تم استلام المنتج المرتجع", exchanged: "تم الاستبدال", refunded: "تم الاسترداد", closed: "تم إغلاق طلب الإرجاع" };
    if (labels[d.status]) {
      await tx.query("insert into public.order_events (order_id, note, visible_to_customer, actor_id) values ($1,$2,true,$3)", [r.order_id, labels[d.status], admin.id]);
    }
    await tx.query("insert into public.audit_log (actor_id, action, entity, entity_id, details) values ($1,'return_update','order',$2,$3::text::jsonb)", [admin.id, r.order_id, JSON.stringify({ return: d.id, status: d.status, cost_party: d.costParty })]);
  }, "تم تحديث طلب الإرجاع.");
}
