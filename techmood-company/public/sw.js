/*
 * TechMood Technology service worker (same approach as the TechMood Platform).
 *
 *   pages          — network first; the last saved copy when offline or when
 *                    the network is slower than NAV_TIMEOUT; /offline.html
 *                    when nothing was saved. The site has no accounts, so
 *                    every page is public and safe to keep.
 *   /_next/static  — the build's code, fonts and styles: cache first (their
 *                    names change with every build).
 *   /brand, icons  — cache first.
 * It also opens the right page when a notification is tapped, and is ready
 * for real push messages once a push server exists (docs/DEPLOYMENT.md).
 */
const VERSION = "v1";
const SHELL = `tm-shell-${VERSION}`;
const PAGES = `tm-pages-${VERSION}`;
const STATIC = `tm-static-${VERSION}`;
const OFFLINE = "/offline.html";
const MAX_PAGES = 50;
const MAX_STATIC = 300;
const NAV_TIMEOUT = 5000;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll([OFFLINE, "/brand/logo-mark.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = [SHELL, PAGES, STATIC];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function trim(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

function pageKey(url) {
  const u = new URL(url);
  u.searchParams.delete("_rsc");
  u.hash = "";
  return u.toString();
}

async function keepPage(request, response) {
  if (!response.ok || response.type !== "basic") return;
  if (!(response.headers.get("content-type") || "").includes("text/html")) return;
  const cache = await caches.open(PAGES);
  await cache.put(pageKey(request.url), response);
  await trim(PAGES, MAX_PAGES);
}

async function navigate(event) {
  const { request } = event;
  const network = fetch(request);
  event.waitUntil(network.then((response) => keepPage(request, response.clone())).catch(() => undefined));
  const slow = new Promise((resolve) => setTimeout(() => resolve("slow"), NAV_TIMEOUT));
  const first = await Promise.race([network.catch(() => "down"), slow]);
  if (first !== "down" && first !== "slow") return first;
  const saved = await (await caches.open(PAGES)).match(pageKey(request.url));
  if (saved) return saved;
  if (first === "slow") return network.catch(() => caches.match(OFFLINE));
  return caches.match(OFFLINE);
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(STATIC);
    await cache.put(request, response.clone());
    trim(STATIC, MAX_STATIC);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/lang/")) return;
  if (request.mode === "navigate") {
    event.respondWith(navigate(event));
    return;
  }
  if (url.pathname.startsWith("/_next/static/") || /^\/(brand\/|icon|apple-icon|og\.png)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "TechMood Technology", {
      body: data.body || "",
      icon: "/brand/logo-mark.png",
      badge: "/brand/logo-mark.png",
      dir: data.lang === "en" ? "ltr" : "rtl",
      lang: data.lang || "ar",
      tag: data.tag || undefined,
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  // only paths on this site
  const url = target.startsWith("/") && !target.startsWith("//") ? target : "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
