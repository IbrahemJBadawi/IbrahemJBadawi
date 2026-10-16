/* Halaqati service worker.
 * - Static assets: cache-first (they are content-hashed).
 * - Public pages: network-first, falling back to the last cached copy.
 * - Private pages (/dashboard, /auth) are never stored on the device,
 *   because family phones are often shared; offline they show /offline.
 */
const VERSION = "halaqati-v2";
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

/* ---- Web Push ---- */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: event.data && event.data.text() }; }
  const title = data.title || "حلقتي";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/dashboard/notifications";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/brand/halaqati-mark-256.png",
      badge: "/brand/halaqati-mark-128.png",
      dir: "rtl",
      lang: "ar",
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
