import { describe, expect, it } from "vitest";
import { computeQuote, deliveryEstimate, effectiveUnitPrice, expectedMargin, isCodAvailable, PricingError } from "@/lib/pricing";
import { formatMoney, fromMills, toMills } from "@/lib/money";

const line = (unitPrice: string, quantity = 1, currency = "USD") => ({ productId: "p", variantId: null, unitPrice, quantity, currency });
const zone = { rate: "5", freeShippingThreshold: "100", currency: "USD", codAvailable: true };

describe("money", () => {
  it("converts without floating point drift", () => {
    expect(toMills("0.1") + toMills("0.2")).toBe(toMills("0.3"));
    expect(fromMills(toMills("19.99") * 3)).toBe("59.970");
  });
  it("formats 3-decimal currencies", () => {
    expect(formatMoney("1.5", "KWD")).toContain("1.500");
    expect(formatMoney("12", "USD")).toContain("$12.00");
    expect(formatMoney("165", "ILS")).toContain("165.00\u00a0₪");
  });
});

describe("pricing", () => {
  it("uses variant override, then sale price, then base price", () => {
    expect(effectiveUnitPrice({ price: "50", salePrice: "40", variantPriceOverride: "45" })).toBe("45");
    expect(effectiveUnitPrice({ price: "50", salePrice: "40" })).toBe("40");
    expect(effectiveUnitPrice({ price: "50", salePrice: null })).toBe("50");
  });

  it("computes totals with shipping and free-shipping threshold", () => {
    const q = computeQuote([line("30", 2)], zone);
    expect(q).toMatchObject({ currency: "USD", subtotalMills: 60_000, shippingMills: 5_000, totalMills: 65_000 });
    expect(computeQuote([line("50", 2)], zone).shippingMills).toBe(0);
  });

  it("refuses mixed currencies (no conversion)", () => {
    expect(() => computeQuote([line("10"), line("10", 1, "SAR")], null)).toThrow(PricingError);
  });

  it("refuses a zone in another currency", () => {
    expect(() => computeQuote([line("10", 1, "SAR")], zone)).toThrow(PricingError);
  });

  it("rejects invalid quantities", () => {
    expect(() => computeQuote([line("10", 0)], null)).toThrow(PricingError);
    expect(() => computeQuote([line("10", 21)], null)).toThrow(PricingError);
  });

  it("offers COD only when store, zone and every supplier allow it", () => {
    const base = { storeCodEnabled: true, zone, country: "JO" };
    expect(isCodAvailable({ ...base, supplierCodCountries: [["JO"], ["JO", "SA"]] })).toBe(true);
    expect(isCodAvailable({ ...base, supplierCodCountries: [["JO"], ["SA"]] })).toBe(false);
    expect(isCodAvailable({ ...base, supplierCodCountries: [["JO"], null] })).toBe(false);
    expect(isCodAvailable({ ...base, storeCodEnabled: false, supplierCodCountries: [["JO"]] })).toBe(false);
    expect(isCodAvailable({ ...base, zone: { ...zone, codAvailable: false }, supplierCodCountries: [["JO"]] })).toBe(false);
  });

  it("widens delivery estimates with product overrides", () => {
    expect(deliveryEstimate({ minDays: 3, maxDays: 7 }, [undefined, { min: 5, max: 9 }])).toEqual({ min: 5, max: 9 });
  });

  it("computes margin only in the same currency", () => {
    expect(expectedMargin({ price: "50", priceCurrency: "USD", cost: "20", shippingCost: "5", costCurrency: "USD" })).toBe(25_000);
    expect(expectedMargin({ price: "50", priceCurrency: "USD", cost: "20", shippingCost: "5", costCurrency: "TRY" })).toBeNull();
  });


});
