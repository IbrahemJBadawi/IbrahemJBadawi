import type { Locale } from "./config";

/** Server-side translator: t("نص", "text") picks the page's language. */
export function translator(locale: Locale) {
  return (ar: string, en: string) => (locale === "ar" ? ar : en);
}

export function formatDate(locale: Locale, iso: string, style: "long" | "medium" = "long") {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
    dateStyle: style,
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}
