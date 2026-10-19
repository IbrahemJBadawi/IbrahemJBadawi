import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Optimistic gate only: redirects visitors without any session cookie away
 * from private pages before rendering. The authoritative checks remain on the
 * server (requireUser / requireAdmin) and in Postgres RLS.
 * With Supabase Auth it also refreshes the session cookies.
 */
const PRIVATE = ["/account", "/favorites", "/admin"];

function hasSessionCookie(req: NextRequest) {
  return req.cookies.getAll().some((c) => c.name === "jamal_session" || (c.name.startsWith("sb-") && c.name.includes("-auth-token")));
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (process.env.AUTH_PROVIDER === "supabase" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    await supabase.auth.getUser();
  }

  if (PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|demo/|demo-art/|media/|icon.png|apple-icon.png|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|api/).*)"],
};
