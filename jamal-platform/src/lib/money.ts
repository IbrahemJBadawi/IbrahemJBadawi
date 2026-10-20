/**
 * Money helpers. Amounts are stored as numeric(12,3) and handled in JS as
 * integer "mills" (1/1000 of a unit) to avoid floating-point errors.
 * There is deliberately NO currency conversion anywhere in the app.
 */
export const MILLS = 1000;

export function toMills(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  return Math.round(Number(value) * MILLS);
}

export function fromMills(mills: number): string {
  return (mills / MILLS).toFixed(3);
}

const DECIMALS: Record<string, number> = { KWD: 3, BHD: 3, OMR: 3, JOD: 3, IQD: 0, LBP: 0, SYP: 0 };

export function currencyDecimals(code: string) {
  return DECIMALS[code] ?? 2;
}

const SYMBOLS: Record<string, { s: string; prefix: boolean }> = {
  USD: { s: "$", prefix: true },
  EUR: { s: "€", prefix: true },
  TRY: { s: "₺", prefix: true },
  ILS: { s: "₪", prefix: false },
  SAR: { s: "ر.س", prefix: false },
  AED: { s: "د.إ", prefix: false },
  KWD: { s: "د.ك", prefix: false },
  QAR: { s: "ر.ق", prefix: false },
  BHD: { s: "د.ب", prefix: false },
  OMR: { s: "ر.ع", prefix: false },
  JOD: { s: "د.أ", prefix: false },
  IQD: { s: "د.ع", prefix: false },
  EGP: { s: "ج.م", prefix: false },
  LBP: { s: "ل.ل", prefix: false },
  SYP: { s: "ل.س", prefix: false },
};

/**
 * Format with Latin digits (common across Gulf/Levant e-commerce). The result
 * is wrapped in Unicode isolates so it renders correctly inside RTL text.
 */
export function formatMoney(value: string | number, currency: string): string {
  const d = currencyDecimals(currency);
  const n = new Intl.NumberFormat("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(value));
  const sym = SYMBOLS[currency];
  if (!sym) return `\u2066${n} ${currency}\u2069`;
  return sym.prefix ? `\u2066${sym.s}${n}\u2069` : `\u2067${n}\u00a0${sym.s}\u2069`;
}
