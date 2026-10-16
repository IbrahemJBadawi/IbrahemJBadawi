/**
 * Pure order-pricing rules (no I/O) — used by the server when quoting and
 * placing orders, and covered by unit tests.
 */
import { toMills } from "./money";

export type PricedLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: string; // numeric string from the database
  currency: string;
};

export type Zone = {
  rate: string;
  freeShippingThreshold: string | null;
  currency: string;
  codAvailable: boolean;
};

export type QuoteResult = {
  currency: string;
  subtotalMills: number;
  shippingMills: number;
  totalMills: number;
};

export class PricingError extends Error {}

/** Effective unit price: variant override → sale price → base price. */
export function effectiveUnitPrice(p: {
  price: string;
  salePrice: string | null;
  variantPriceOverride?: string | null;
}): string {
  if (p.variantPriceOverride !== null && p.variantPriceOverride !== undefined) return p.variantPriceOverride;
  if (p.salePrice !== null && p.salePrice !== undefined) return p.salePrice;
  return p.price;
}

export function computeQuote(lines: PricedLine[], zone: Zone | null): QuoteResult {
  if (lines.length === 0) throw new PricingError("السلة فارغة.");
  const currencies = new Set(lines.map((l) => l.currency));
  if (currencies.size > 1) {
    throw new PricingError("تحتوي السلة على منتجات بعملات مختلفة. يرجى إتمام طلب منفصل لكل عملة.");
  }
  const currency = lines[0].currency;
  let subtotal = 0;
  for (const l of lines) {
    if (!Number.isInteger(l.quantity) || l.quantity < 1 || l.quantity > 20) {
      throw new PricingError("كمية غير صالحة.");
    }
    subtotal += toMills(l.unitPrice) * l.quantity;
  }
  let shipping = 0;
  if (zone) {
    if (zone.currency !== currency) {
      throw new PricingError("الشحن إلى هذه الدولة غير متاح بعملة هذه المنتجات.");
    }
    const threshold = zone.freeShippingThreshold ? toMills(zone.freeShippingThreshold) : null;
    shipping = threshold !== null && subtotal >= threshold ? 0 : toMills(zone.rate);
  }
  return { currency, subtotalMills: subtotal, shippingMills: shipping, totalMills: subtotal + shipping };
}

/**
 * Cash on delivery is offered only when ALL of these hold:
 * the store enabled it, the shipping zone supports it, and every supplier
 * involved confirmed COD for the destination country.
 */
export function isCodAvailable(opts: {
  storeCodEnabled: boolean;
  zone: Zone | null;
  country: string;
  supplierCodCountries: (string[] | null)[]; // one entry per line; null = no supplier linked
}): boolean {
  if (!opts.storeCodEnabled || !opts.zone?.codAvailable) return false;
  return opts.supplierCodCountries.every((list) => !!list && list.includes(opts.country));
}

/** Delivery estimate: zone default, widened by any per-product override. */
export function deliveryEstimate(
  zone: { minDays: number; maxDays: number },
  overrides: ({ min: number; max: number } | undefined)[],
) {
  let min = zone.minDays;
  let max = zone.maxDays;
  for (const o of overrides) {
    if (!o) continue;
    min = Math.max(min, o.min);
    max = Math.max(max, o.max);
  }
  return { min, max };
}

/** Expected margin per unit; null when currencies differ (no conversion). */
export function expectedMargin(opts: {
  price: string;
  priceCurrency: string;
  cost: string | null;
  shippingCost: string | null;
  costCurrency: string | null;
}): number | null {
  if (opts.cost === null || !opts.costCurrency || opts.costCurrency !== opts.priceCurrency) return null;
  return toMills(opts.price) - toMills(opts.cost) - toMills(opts.shippingCost);
}

export const ORDER_STATUS_FLOW: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function canTransition(from: string, to: string) {
  return ORDER_STATUS_FLOW[from]?.includes(to) ?? false;
}
