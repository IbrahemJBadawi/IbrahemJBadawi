import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

/** Refreshes the auth session cookie and guards private routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run code between client creation and this call.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const path = request.nextUrl.pathname;

  // A redirect must carry any cookies the refresh just wrote: the old refresh
  // token is already spent, so dropping them would sign the person out.
  // (The proxy needs an absolute URL; nextUrl already reflects the browser's host.)
  const redirect = (pathname: string, search = "") => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = search;
    const res = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!signedIn && path.startsWith("/dashboard")) {
    return redirect("/login", `?next=${encodeURIComponent(path + request.nextUrl.search)}`);
  }
  // Signed-in people open the app straight into their dashboard.
  if (signedIn && (path === "/" || path === "/login" || path === "/register")) {
    return redirect("/dashboard");
  }
  return response;
}
