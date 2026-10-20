import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured, SUPABASE_ANON_KEY, SUPABASE_URL, type Profile } from "./config";

/** عميل خادم مرتبط بجلسة المستخدم (من الكوكيز) — يخضع لسياسات RLS بصلاحيات المستخدم نفسه. */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* لا يمكن ضبط الكوكيز داخل Server Components؛ يتولى proxy.ts تحديث الجلسة */
        }
      },
    },
  });
}

/** عميل عام بلا جلسة لقراءة المحتوى المنشور (يمكن تخزين نتائجه مؤقتًا). */
let publicClient: SupabaseClient | null = null;
export function getPublicSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  publicClient ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}

/** يتحقق من المستخدم الحالي على الخادم عبر Supabase Auth (وليس من الكوكيز فقط) ويعيد ملفه. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .eq("id", userData.user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
}
