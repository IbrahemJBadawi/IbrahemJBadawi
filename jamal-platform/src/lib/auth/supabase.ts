import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { AuthResult, SessionIdentity } from "./types";

/**
 * Supabase Auth adapter. Uses only the public URL + anon/publishable key;
 * the service-role key is never needed for authentication.
 */
export async function supabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("AUTH_PROVIDER=supabase requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  const store = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

function translate(message: string) {
  if (/invalid login credentials/i.test(message)) return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
  if (/already registered/i.test(message)) return "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول.";
  if (/email not confirmed/i.test(message)) return "يرجى تأكيد بريدك الإلكتروني أولًا من الرسالة المرسلة إليك.";
  return "تعذّر إكمال العملية، حاول مرة أخرى.";
}

export async function supabaseGetSession(): Promise<SessionIdentity | null> {
  const supabase = await supabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

export async function supabaseSignUp(email: string, password: string, fullName: string): Promise<AuthResult> {
  const supabase = await supabaseServerClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName }, emailRedirectTo: site ? `${site}/login` : undefined },
  });
  if (error) return { ok: false, error: translate(error.message) };
  return { ok: true, needsEmailConfirmation: !data.session };
}

export async function supabaseSignIn(email: string, password: string): Promise<AuthResult> {
  const supabase = await supabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: translate(error.message) };
  return { ok: true };
}

export async function supabaseSignOut() {
  const supabase = await supabaseServerClient();
  await supabase.auth.signOut();
}
