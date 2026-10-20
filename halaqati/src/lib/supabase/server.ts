import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { publicEnv, isSupabaseConfigured } from "@/lib/env";

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured");
  }
}

/** Per-request client acting as the signed-in user (RLS applies). */
export async function createClient() {
  // Read cookies first: it marks the route as dynamic (never prerendered).
  const cookieStore = await cookies();
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();
  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session.
        }
      },
    },
  });
}

/** Cookie-less anonymous client for public, cacheable reads. */
export function createPublicClient() {
  if (!isSupabaseConfigured) throw new SupabaseNotConfiguredError();
  return createPlainClient(publicEnv.supabaseUrl, publicEnv.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
