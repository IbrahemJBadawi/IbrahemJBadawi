/**
 * Arabic is the default and lives at the root (/about); English lives under
 * /en (/en/about). Internally every page sits in app/[lang]; src/proxy.ts
 * rewrites unprefixed paths to /ar.
 */
export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

/** Remembers the visitor's choice (set by /lang/[lang], read by the proxy). */
export const LOCALE_COOKIE = "tm_lang";

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dirOf(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

/** A public path for a page in a language: href("en", "/about") → "/en/about". */
export function href(locale: Locale, path: string = "/") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

/** Strips the language prefix: "/en/about" → "/about". */
export function stripLocale(pathname: string) {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1);
  }
  return pathname;
}

/** Bilingual text in data files. */
export type Text = { ar: string; en: string };
export type TextList = { ar: string[]; en: string[] };

export function pick<T>(value: { ar: T; en: T }, locale: Locale): T {
  return value[locale];
}
