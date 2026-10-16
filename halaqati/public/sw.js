/* Halaqati service worker.
 * - Static assets: cache-first (they are content-hashed).
 * - Public pages: network-first, falling back to the last cached copy.
 * - Private pages (/dashboard, /auth) are never stored on the device,
 *   because family phones are often shared; offline they show /offline.
 */
const VERSION = "halaqati-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PUBLIC_PAGES = ["/", "/halaqat", "/teachers", "/centers", "/about", "/privacy", "/terms", "/app", "/verify"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/offline", "/"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function isPublicPage(url) {
  return PUBLIC_PAGES.some((p) => url.pathname === p || (p !== "/" && url.pathname.startsWith(p + "/")));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then((c) => c.put(req, copy)); }
        return res;
      })),
    );
    return;
  }

  if (req.mode === "navigate") {
    const cacheable = isPublicPage(url);
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable && res.ok) { const copy = res.clone(); caches.open(PAGES).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(async () => (cacheable && (await caches.match(req))) || (await caches.match("/offline"))),
    );
  }
});
