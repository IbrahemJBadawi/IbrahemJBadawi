import "server-only";
import { headers } from "next/headers";
import { connection } from "next/server";

/**
 * Minimal in-memory fixed-window rate limiter. It protects a single server
 * instance against bursts (login guessing, order spam). On serverless
 * deployments each instance has its own memory — for stronger guarantees use
 * a shared store (e.g. Upstash Redis free tier) later.
 */
const buckets = new Map<string, { count: number; reset: number }>();

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function rateLimit(scope: string, limit: number, windowMs: number) {
  await connection();
  const key = `${scope}:${await clientIp()}`;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}
