/* Public static demo only. Never cache API requests, account data or credentials. */
const CACHE_NAME = "paymood-shell-20261116-v1";
const APP_FILES = ["/","/index.html","/app.js","/styles.css","/pwa.js","/pwa.css","/favicon.svg","/manifest.webmanifest","/icon-192.png","/icon-512.png"];
const APP_FILE_PATHS = new Set(APP_FILES);
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("paymood-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put("/index.html", response.clone());
      }
      return response;
    }).catch(async () => (await caches.match("/index.html")) || Response.error()));
    return;
  }
  if (!APP_FILE_PATHS.has(url.pathname)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); }
    return response;
  })));
});
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  const relativePath = typeof data.url === "string" && data.url.startsWith("/") && !data.url.startsWith("//") ? data.url : "/";
  event.waitUntil(self.registration.showNotification(data.title || "paymood", {
    body: data.body || "لديك إشعار جديد",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    dir: "rtl",
    lang: "ar",
    data: { url: relativePath }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const path = event.notification.data?.url || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const client = clients.find(item => new URL(item.url).origin === self.location.origin);
    return client ? client.navigate(path).then(() => client.focus()) : self.clients.openWindow(path);
  }));
});
