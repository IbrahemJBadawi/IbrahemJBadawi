import "server-only";

/**
 * A best-effort limit on contact submissions per client: in memory, per
 * server instance. It stops a script hammering one instance; it is not a
 * global guarantee (serverless instances don't share memory). For that, put
 * Vercel's firewall rate limiting or a shared store in front — see
 * docs/DEPLOYMENT.md.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

export function allowSubmission(key: string, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    // keep memory bounded: drop the oldest keys
    for (const old of Array.from(hits.keys()).slice(0, 1000)) hits.delete(old);
  }
  return true;
}

export function resetRateLimit() {
  hits.clear();
}
