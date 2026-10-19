import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALE_COOKIE } from "@/i18n/config";

/**
 * Language routing.
 *   /about      → Arabic (rewritten internally to /ar/about)
 *   /en/about   → English
 *   /ar/about   → redirected to /about, so each page has one address
 * A visitor who chose English (cookie set by /lang/en) and opens an Arabic
 * address is sent to the English one; choosing Arabic again clears that.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) return NextResponse.next();

  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (request.cookies.get(LOCALE_COOKIE)?.value === "en") {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

export const config = {
  // everything except Next internals, the language switch, and files with an extension
  matcher: ["/((?!_next/|lang/|api/|.*\\.[a-zA-Z0-9]+$).*)"],
};
