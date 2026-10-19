/** Formatting helpers. Dates are always shown in the company's time zone. */
const nf = new Intl.NumberFormat("ar", { maximumFractionDigits: 1 });

export const fmtNumber = (n: number | null | undefined) => (n == null ? "—" : nf.format(n));

export function fmtPercent(ratio: number | null | undefined) {
  if (ratio == null || Number.isNaN(ratio)) return "—";
  return new Intl.NumberFormat("ar", { style: "percent", maximumFractionDigits: 1 }).format(ratio);
}

export function fmtMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("ar", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export function fmtDateTime(value: string | Date | null | undefined, timeZone: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", { timeZone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function fmtDate(value: string | Date | null | undefined, timeZone: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar", { timeZone, dateStyle: "medium" }).format(new Date(value));
}

export function fmtTime(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("ar", { timeZone, hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function fmtDayLabel(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("ar", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(new Date(value));
}

/** "منذ 5 دقائق" style relative time. */
export function fmtRelative(value: string | Date | null | undefined, now = new Date()) {
  if (!value) return "—";
  const diff = (new Date(value).getTime() - now.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (86400 * 30)), "month");
}

/** YYYY-MM-DD of an instant in a time zone. */
export function zonedDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

/** Value for a datetime-local input, in a time zone. */
export function zonedInputValue(value: string | Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(value));
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
}

/** Digits only, with a leading country code, for wa.me links. */
export function whatsappNumber(phone: string | null | undefined) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 ? digits : null;
}

export function csvCell(value: unknown) {
  const s = value == null ? "" : String(value);
  // Prevent formula injection when opened in a spreadsheet.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}
