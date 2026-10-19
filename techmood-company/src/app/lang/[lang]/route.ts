import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE, href, isLocale } from "@/i18n/config";

/**
 * /lang/en?next=/en/about — saves the language for a year and returns to the
 * page. `next` must be a path on this site (no "//", no scheme), so this can
 * never be used as an open redirect.
 */
export function GET(request: NextRequest, { params }: { params: Promise<{ lang: string }> }) {
  return params.then(({ lang }) => {
    const locale = isLocale(lang) ? lang : "ar";
    const next = request.nextUrl.searchParams.get("next") ?? "";
    const safe = /^\/(?!\/)[^\\\s]*$/.test(next) ? next : href(locale, "/");
    const response = NextResponse.redirect(new URL(safe, request.url), 303);
    response.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
    return response;
  });
}
