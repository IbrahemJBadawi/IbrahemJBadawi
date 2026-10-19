import "server-only";
import { publicEnv } from "@/lib/env";

/**
 * Which external sign-in providers are switched on in Supabase. Read from
 * the public Auth settings endpoint so a button only appears once the
 * provider really works.
 */
export async function enabledProviders(): Promise<{ google: boolean }> {
  try {
    const res = await fetch(`${publicEnv.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: publicEnv.supabaseKey },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { google: false };
    const s = (await res.json()) as { external?: Record<string, boolean> };
    return { google: Boolean(s.external?.google) };
  } catch {
    return { google: false };
  }
}
