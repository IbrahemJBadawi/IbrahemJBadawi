/** إعدادات Supabase العامة. المفتاح هنا هو المفتاح العام (anon/publishable) فقط، والحماية الفعلية عبر RLS. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && /^https?:\/\//.test(SUPABASE_URL),
);

export type Role = "user" | "editor" | "admin";

export interface Profile {
  id: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}
