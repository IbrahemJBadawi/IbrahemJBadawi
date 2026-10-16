/**
 * Public configuration. Only NEXT_PUBLIC_* values may be read here.
 *
 * The Supabase URL and publishable key are public by design (data is
 * protected by RLS), so the production project's values are the default
 * when the environment does not set them. Override them per environment.
 */
const DEFAULT_SUPABASE_URL = "https://adoohwswgvajeyzkhhnf.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UTL9UL_Qa_SYwqVU-JVk6A_2rc4zyyY";

const vercelProd = process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const publicEnv = {
  siteUrl: (
    process.env.NEXT_PUBLIC_SITE_URL ??
    (vercelProd ? `https://${vercelProd}` : "http://localhost:3000")
  ).replace(/\/$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL,
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_PUBLISHABLE_KEY,
};

export const isSupabaseConfigured = Boolean(publicEnv.supabaseUrl && publicEnv.supabaseKey);
