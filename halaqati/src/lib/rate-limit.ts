import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/admin";

const memory = new Map<string, { windowStart: number; hits: number }>();

/**
 * Fixed-window limiter. Uses the database (shared across instances) when
 * the service key is configured, otherwise a per-instance memory fallback.
 * Returns true when the action is allowed.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const service = createServiceClient();
  if (service) {
    const { data, error } = await service.rpc("check_rate_limit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (!error) return data === true;
  }
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000)) * windowSeconds * 1000;
  const entry = memory.get(key);
  if (!entry || entry.windowStart !== windowStart) {
    memory.set(key, { windowStart, hits: 1 });
    if (memory.size > 10_000) memory.clear();
    return true;
  }
  entry.hits += 1;
  return entry.hits <= max;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
