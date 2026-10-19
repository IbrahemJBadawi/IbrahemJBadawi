/* TechMood Growth service worker.
 * - Static assets: cache-first (content-hashed).
 * - Public marketing pages: network-first with a cached fallback.
 * - Private pages (/dashboard, /admin) and public forms are never stored on
 *   the device: they hold customer data or must always be fresh.
 * - Web Push: shows team notifications and opens the right page on tap.
 */
const VERSION = "growth-v1";
const STATIC = `${VERSION}-static`;
const PAGES = `${VERSION}-pages`;
const PUBLIC_PAGES = ["/", "/features", "/pricing", "/privacy", "/terms", "/install"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(["/offline", "/"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

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
    const cacheable = PUBLIC_PAGES.includes(url.pathname);
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

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data && event.data.text() }; }
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/dashboard/notifications";
  event.waitUntil(
    self.registration.showNotification(data.title || "TechMood Growth", {
      body: data.body || "",
      icon: "/brand/icon-192.png",
      badge: "/brand/mark-96.png",
      dir: "rtl",
      lang: "ar",
      tag: data.tag || undefined,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    }),
  );
});
