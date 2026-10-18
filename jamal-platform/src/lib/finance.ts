/**
 * Order financials (pure). All amounts in one currency — the order's.
 * Anything recorded in another currency is reported as "not comparable"
 * instead of being converted.
 *
 * Revenue side : what the customer pays (products − discount + delivery fee + fees).
 * Cost side    : supplier product cost + ACTUAL delivery cost (once, whoever is
 *                paid) + payment/transfer fees + return costs + other expenses.
 * Money transferred to a supplier is a cost being settled — never profit.
 */
import { fromMills, toMills } from "./money";

export type FinOrder = {
  currency: string;
  subtotal: string;
  discount: string;
  shippingFee: string; // charged to the customer (revenue)
  fees: string;
  total: string;
  amountCollected: string;
  expectedShippingCost: string | null;
};
export type FinFulfillment = {
  status: string;
  costCurrency: string | null;
  expectedCost: string | null; // supplier product cost snapshot
  actualCost: string | null; // agreed product cost
  actualShippingCost: string | null; // actual delivery cost
  shippingPaidTo: "supplier" | "courier" | "none";
  settlementStatus: string;
  settlementPaidAmount: string | null;
  supplierRefundAmount: string | null;
  supplierRefundStatus: string;
};
export type FinExpense = { kind: string; amount: string; currency: string };
export type FinRefund = { amount: string; currency: string; status: string };

export type Financials = {
  expectedRevenue: string;
  collected: string;
  refundsCompleted: string;
  refundsPending: string;
  netCollected: string;
  productCost: string | null;
  shippingCost: string | null;
  expenses: string;
  supplierDue: string | null;
  supplierTransferred: string;
  expectedProfit: string | null;
  actualProfit: string | null;
  missing: string[];
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function computeFinancials(o: FinOrder, fulfillments: FinFulfillment[], expenses: FinExpense[], refunds: FinRefund[]): Financials {
  const missing: string[] = [];
  const cur = o.currency;
  const active = fulfillments.filter((f) => f.status !== "cancelled");
  const sameCurrency = active.every((f) => !f.costCurrency || f.costCurrency === cur);
  if (!sameCurrency) missing.push(`تكاليف بعملة غير ${cur} — لا يتم تحويل العملات`);

  const expectedRevenue = toMills(o.total);
  const collected = toMills(o.amountCollected);
  const refundsCompleted = sum(refunds.filter((r) => r.status === "completed" && r.currency === cur).map((r) => toMills(r.amount)));
  const refundsPending = sum(refunds.filter((r) => r.status === "pending" && r.currency === cur).map((r) => toMills(r.amount)));
  const expensesTotal = sum(expenses.filter((e) => e.currency === cur).map((e) => toMills(e.amount)));
  if (expenses.some((e) => e.currency !== cur)) missing.push("مصروفات بعملة مختلفة غير محتسبة");

  // Expected profit: approved total − supplier cost snapshot − estimated delivery cost.
  const expectedCostKnown = active.length > 0 && sameCurrency && active.every((f) => f.expectedCost !== null);
  const expectedProfit = expectedCostKnown
    ? expectedRevenue - sum(active.map((f) => toMills(f.expectedCost))) - toMills(o.expectedShippingCost)
    : null;
  if (!expectedCostKnown) missing.push("تكلفة المورد المتوقعة غير مكتملة");

  // Actual: requires agreed product cost and actual delivery cost on every active fulfillment.
  const actualKnown = active.length > 0 && sameCurrency && active.every((f) => f.actualCost !== null && f.actualShippingCost !== null);
  const productCost = actualKnown ? sum(active.map((f) => toMills(f.actualCost))) : null;
  const shippingCost = actualKnown ? sum(active.map((f) => toMills(f.actualShippingCost))) : null;
  // Supplier credits only count once actually received.
  const supplierCredits = sum(active.filter((f) => f.supplierRefundStatus === "received").map((f) => toMills(f.supplierRefundAmount)));
  const supplierDue = actualKnown
    ? sum(active.map((f) => toMills(f.actualCost) + (f.shippingPaidTo === "supplier" ? toMills(f.actualShippingCost) : 0)))
    : null;
  const supplierTransferred = sum(active.filter((f) => f.settlementStatus === "paid").map((f) => toMills(f.settlementPaidAmount)));
  if (!actualKnown) missing.push("سجّل تكلفة المنتجات وتكلفة التوصيل الفعلية لكل مورد");

  const netCollected = collected - refundsCompleted;
  const actualProfit =
    actualKnown && collected > 0 ? netCollected - productCost! - shippingCost! - expensesTotal + supplierCredits : null;
  if (collected === 0) missing.push("لم يُسجّل أي مبلغ محصّل بعد");

  return {
    expectedRevenue: fromMills(expectedRevenue),
    collected: fromMills(collected),
    refundsCompleted: fromMills(refundsCompleted),
    refundsPending: fromMills(refundsPending),
    netCollected: fromMills(netCollected),
    productCost: productCost === null ? null : fromMills(productCost),
    shippingCost: shippingCost === null ? null : fromMills(shippingCost),
    expenses: fromMills(expensesTotal),
    supplierDue: supplierDue === null ? null : fromMills(supplierDue),
    supplierTransferred: fromMills(supplierTransferred),
    expectedProfit: expectedProfit === null ? null : fromMills(expectedProfit),
    actualProfit: actualProfit === null ? null : fromMills(actualProfit),
    missing,
  };
}

/** Customer total: products − discount + delivery fee + declared fees. Delivery fee appears once. */
export function orderTotal(subtotal: string, discount: string, shippingFee: string, fees: string) {
  return fromMills(toMills(subtotal) - toMills(discount) + toMills(shippingFee) + toMills(fees));
}
