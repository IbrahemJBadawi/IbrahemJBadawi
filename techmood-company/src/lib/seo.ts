import type { Metadata } from "next";
import { COMPANY } from "@/config/company";
import { HAS_CONFIRMED_DOMAIN, SITE_URL } from "@/config/site";
import { href, type Locale } from "@/i18n/config";

/**
 * Per-page metadata: a unique title and description, Open Graph, and the
 * hreflang alternates. Canonical URLs only once the domain is confirmed
 * (NEXT_PUBLIC_SITE_URL), never on a temporary address.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
}: {
  locale: Locale;
  path: string;
  title: string;
  description: string;
}): Metadata {
  const url = href(locale, path);
  return {
    title,
    description,
    alternates: {
      canonical: HAS_CONFIRMED_DOMAIN ? url : undefined,
      languages: { ar: href("ar", path), en: href("en", path), "x-default": href("ar", path) },
    },
    openGraph: {
      type: "website",
      siteName: COMPANY.name,
      title,
      description,
      url: `${SITE_URL}${url === "/" ? "" : url}`,
      locale: locale === "ar" ? "ar_PS" : "en_US",
      alternateLocale: locale === "ar" ? ["en_US"] : ["ar_PS"],
      images: [{ url: "/og.png", width: 1200, height: 630, alt: `${COMPANY.name} — ${COMPANY.tagline}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}
