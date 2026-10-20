import { NextResponse, type NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-redirect";

/** يستقبل روابط تأكيد البريد واستعادة كلمة المرور (PKCE) وينشئ الجلسة على الخادم. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await getServerSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const fail = new URL("/login", url.origin);
  fail.searchParams.set("error", "link");
  return NextResponse.redirect(fail);
}
