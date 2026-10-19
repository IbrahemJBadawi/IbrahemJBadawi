import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";

/** Origin of the current request (works on preview and production domains). */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return env.siteUrl;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
