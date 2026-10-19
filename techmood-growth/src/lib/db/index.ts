import "server-only";
import { connection } from "next/server";
import { withContext, type DbContext, type Tx } from "./core";

export type { Tx } from "./core";

async function run<T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>) {
  await connection(); // never query while prerendering at build time
  return withContext(ctx, fn);
}

/** Public pages and intake — RLS as an anonymous visitor. */
export function asAnon<T>(fn: (tx: Tx) => Promise<T>) {
  return run({ role: "anon" }, fn);
}

/** Signed-in requests — RLS as this user. */
export function asUser<T>(user: { id: string; email?: string | null }, fn: (tx: Tx) => Promise<T>) {
  return run({ role: "authenticated", userId: user.id, email: user.email }, fn);
}

/**
 * Trusted server bookkeeping only (auth tables, rate limits, push
 * delivery, reminder jobs). Never pass client-chosen SQL or unchecked ids.
 */
export function asSystem<T>(fn: (tx: Tx) => Promise<T>) {
  return run({ role: "system" }, fn);
}
