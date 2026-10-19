import { NextResponse, type NextRequest } from "next/server";
import { authProvider } from "@/lib/auth";
import { finishLocalGoogle } from "@/lib/auth/google";
import { supabaseServerClient } from "@/lib/auth/supabase";

const safe = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : "/account");

/** Return from Google (Supabase OAuth or the local OpenID Connect flow). */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const fail = NextResponse.redirect(new URL("/login?error=google", url));
  if (!code) return fail;
  if (authProvider() === "supabase") {
    const supabase = await supabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return error ? fail : NextResponse.redirect(new URL(safe(url.searchParams.get("next")), url));
  }
  const next = await finishLocalGoogle(code, url.searchParams.get("state") ?? "");
  return next ? NextResponse.redirect(new URL(safe(next), url)) : fail;
}
