import "server-only";
import crypto from "node:crypto";
import { headers } from "next/headers";
import { asSystem } from "@/lib/db";

/**
 * Fixed-window limiter stored in the database (private.rate_limits), so it
 * is shared by every server instance. Returns true when allowed.
 */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const [row] = await asSystem((tx) =>
      tx.query<{ ok: boolean }>("select private.consume_rate_limit($1, $2, $3) as ok", [key, max, windowSeconds]),
    );
    return row.ok;
  } catch {
    return true; // never lock everyone out because the limiter failed
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Opaque visitor key for public forms: a salted hash, never the raw IP. */
export async function visitorKey(): Promise<string> {
  const h = await headers();
  const salt = process.env.AUTH_SECRET || "techmood-growth";
  return crypto.createHash("sha256").update(`${salt}|${await clientIp()}|${h.get("user-agent") ?? ""}`).digest("hex").slice(0, 40);
}
