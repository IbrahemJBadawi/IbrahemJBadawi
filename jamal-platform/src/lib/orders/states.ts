/**
 * Order workflow (pure rules, no I/O) — enforced on the server.
 *
 * Three separate dimensions:
 *  - orders.status            : the business workflow of the order
 *  - orders.payment_status    : money from the customer (changed ONLY by admin
 *                               verification or refunds — never by the customer)
 *  - fulfillment_records.status: supplier execution & shipment
 */

export const ORDER_STATUSES = [
  "new", "under_review", "awaiting_stock", "awaiting_payment", "payment_review", "paid",
  "awaiting_supplier_payout", "supplier_paid", "processing", "shipped", "delivered",
  "cancel_requested", "cancelled", "returned", "refund_pending", "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "pending_verification", "paid", "partially_refunded", "refunded"] as const;
export const FULFILLMENT_STATUSES = [
  "awaiting_supplier", "sent_to_supplier", "supplier_accepted", "preparing", "shipped",
  "delivered", "delivery_failed", "cancelled", "returned",
] as const;
export const SETTLEMENT_STATUSES = ["not_due", "due", "awaiting_transfer", "paid", "disputed", "cancelled"] as const;

/** Statuses before the price is approved: stock/price can still be edited. */
export const PRE_APPROVAL: readonly string[] = ["new", "under_review", "awaiting_stock"];
/** Customer may cancel directly (no money involved yet). */
export const CUSTOMER_FREE_CANCEL: readonly string[] = ["new", "under_review", "awaiting_stock", "awaiting_payment"];
/** Customer may only REQUEST cancellation (money may have been sent/collected). */
export const CUSTOMER_CANCEL_REQUEST: readonly string[] = ["payment_review", "paid", "awaiting_supplier_payout", "supplier_paid", "processing"];
export const TERMINAL: readonly string[] = ["cancelled", "refunded"];

/**
 * Transitions an admin may pick manually. Others happen only through
 * dedicated actions: price approval (→ awaiting_payment), proof upload
 * (→ payment_review), payment verification (→ paid), cancellation and
 * cancellation-request decisions.
 */
export const MANUAL_TRANSITIONS: Record<string, string[]> = {
  new: ["under_review", "awaiting_stock"],
  under_review: ["awaiting_stock"],
  awaiting_stock: ["under_review"],
  awaiting_payment: ["awaiting_stock"],
  payment_review: [],
  paid: ["awaiting_supplier_payout", "processing"],
  awaiting_supplier_payout: ["supplier_paid", "processing"],
  supplier_paid: ["processing"],
  processing: ["shipped"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancel_requested: [],
  cancelled: [],
  returned: ["refund_pending"],
  refund_pending: ["refunded"],
  refunded: [],
};

export type GuardContext = {
  paymentStatus: string;
  allItemsAvailable: boolean;
  activeSettlements: { status: string }[];
  activeFulfillments: { status: string; carrier: string | null; tracking_number: string | null }[];
  pendingRefunds: number;
  completedRefunds: number;
};

/** Returns an Arabic error when a manual transition is not allowed, else null. */
export function transitionError(from: string, to: string, ctx: GuardContext): string | null {
  if (!MANUAL_TRANSITIONS[from]?.includes(to)) return "لا يمكن الانتقال إلى هذه الحالة من الحالة الحالية.";
  switch (to) {
    case "awaiting_supplier_payout":
    case "supplier_paid":
    case "processing":
      if (ctx.paymentStatus !== "paid") return "لا يمكن المتابعة قبل تأكيد وصول الدفع فعليًا.";
      if (!ctx.allItemsAvailable) return "يجب تأكيد توفر جميع المنتجات لدى المورد أولًا.";
      if (to === "supplier_paid" && ctx.activeSettlements.some((s) => s.status !== "paid")) {
        return "سجّل تحويل مستحقات كل مورد (حالة «تم التحويل») قبل هذه الحالة.";
      }
      return null;
    case "shipped":
      if (!ctx.activeFulfillments.some((f) => f.carrier || f.tracking_number)) {
        return "سجّل جهة الشحن أو رقم التتبع في سجل التنفيذ أولًا.";
      }
      return null;
    case "refund_pending":
      return ctx.pendingRefunds > 0 ? null : "أنشئ سجل استرداد معلّق أولًا.";
    case "refunded":
      if (ctx.pendingRefunds > 0) return "توجد استردادات معلّقة لم تُنفّذ بعد.";
      return ctx.completedRefunds > 0 ? null : "لا يوجد استرداد مُنفّذ مسجّل.";
    default:
      return null;
  }
}

/** Fulfillment steps that require confirmed payment + stock first. */
export const FULFILLMENT_NEEDS_PAYMENT: readonly string[] = ["sent_to_supplier", "supplier_accepted", "preparing", "shipped", "delivered"];

/** Settlement may be marked as paid only with explicit details and a paid order. */
export function settlementError(opts: {
  to: string;
  orderPaymentStatus: string;
  paidAmount: string | null;
  paidAt: string | null;
  reference: string | null;
}): string | null {
  if (["due", "awaiting_transfer", "paid"].includes(opts.to) && !["paid", "partially_refunded"].includes(opts.orderPaymentStatus)) {
    return "لا تُستحق مستحقات المورد قبل تأكيد تحصيل المبلغ من العميل.";
  }
  if (opts.to === "paid" && (!opts.paidAmount || !opts.paidAt || !opts.reference)) {
    return "لتسجيل التحويل كمدفوع أدخل المبلغ المحوّل وتاريخ التحويل ومرجعه.";
  }
  return null;
}

/** Payment status implied by money actually collected and refunded. */
export function paymentStatusFor(opts: { collectedMills: number; dueMills: number; refundedMills: number; pendingProofs: number }) {
  if (opts.refundedMills > 0) return opts.refundedMills >= opts.collectedMills ? "refunded" : "partially_refunded";
  if (opts.dueMills > 0 && opts.collectedMills >= opts.dueMills) return "paid";
  if (opts.pendingProofs > 0 || opts.collectedMills > 0) return "pending_verification";
  return "unpaid";
}
