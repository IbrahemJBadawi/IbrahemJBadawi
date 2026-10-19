import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic gate only: visitors without a session cookie are sent to the
 * login page before rendering private areas. The real checks happen on the
 * server (requireUser/requireOrg) and in Postgres RLS on every query.
 */
const PRIVATE = ["/dashboard", "/admin", "/onboarding"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.has("tg_session");
  if (!signedIn && PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|brand/|.*\\.(?:svg|png|jpg|jpeg|webp|ico|txt|xml)$).*)"],
};
