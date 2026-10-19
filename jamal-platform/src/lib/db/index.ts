import "server-only";
import { after, connection } from "next/server";
import { withContext, type DbContext, type Tx } from "./core";
import { drainPushOutbox, hasQueuedPush } from "@/lib/push/server";

export type { Tx } from "./core";

/**
 * Database access for Next.js server code. `connection()` makes sure no
 * query runs while prerendering at build time (Cache Components).
 */
async function run<T>(ctx: DbContext, fn: (tx: Tx) => Promise<T>) {
  await connection();
  const result = await withContext(ctx, fn);
  // Writes can create notifications (DB triggers): send pushes after the response.
  if (ctx.role !== "anon") {
    try {
      after(sendQueuedPush);
    } catch {
      // Outside a request (scripts): the cron endpoint drains instead.
    }
  }
  return result;
}

let draining = false;
let again = false;
async function sendQueuedPush() {
  if (draining) {
    again = true;
    return;
  }
  draining = true;
  try {
    do {
      again = false;
      if (await hasQueuedPush()) await drainPushOutbox();
    } while (again);
  } catch (e) {
    console.error("push drain failed", e instanceof Error ? e.message : e);
  } finally {
    draining = false;
  }
}

/** Public catalog reads — RLS as an anonymous visitor. */
export function asAnon<T>(fn: (tx: Tx) => Promise<T>) {
  return run({ role: "anon" }, fn);
}

/** Customer/admin requests — RLS as this user (admin checks happen in SQL too). */
export function asUser<T>(
  user: { id: string; email?: string | null },
  fn: (tx: Tx) => Promise<T>,
) {
  return run({ role: "authenticated", userId: user.id, email: user.email }, fn);
}

/**
 * Trusted server operations that must not be steerable by the client
 * (creating orders with server-computed prices, auth bookkeeping…).
 * Never pass client-provided SQL or unchecked values to these queries.
 */
export function asSystem<T>(fn: (tx: Tx) => Promise<T>) {
  return run({ role: "system" }, fn);
}
