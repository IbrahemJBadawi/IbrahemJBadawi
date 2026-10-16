/* واحة القرآن — Service Worker
 * - الملفات الثابتة (/_next/static) وبيانات القرآن (/data/quran): من التخزين أولًا.
 * - الصفحات: من الشبكة أولًا، ثم النسخة المخزنة، ثم صفحة "غير متصل".
 * - لا يُخزَّن أي طلب إلى خوادم خارجية (مثل Supabase) ولا أي بيانات مصادقة.
 * - تنزيل المصحف للقراءة دون اتصال يتم فقط بطلب صريح من المستخدم (رسالة DOWNLOAD_QURAN).
 */
const VERSION = "v1";
const STATIC_CACHE = `qo-static-${VERSION}`;
const PAGES_CACHE = `qo-pages-${VERSION}`;
// اسم ذاكرة بيانات القرآن مرتبط ببصمة النص؛ يتغير فقط إذا تغيّر النص المعتمد
const DATA_CACHE = "qo-data-6ab95356";
const KEEP = [STATIC_CACHE, PAGES_CACHE, DATA_CACHE];
const PRECACHE = ["/offline", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon.svg"];
const OFFLINE_PAGES = ["/today", "/quran", "/adhkar", "/adhkar/morning", "/adhkar/evening", "/adhkar/sleep", "/adhkar/after-prayer", "/adhkar/waking", "/adhkar/duas", "/oasis", "/plan", "/hifz", "/saved"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("qo-") && !KEEP.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
      const url = new URL(request.url);
      // لا نخزّن صفحات الحساب والإدارة
      if (!/^\/(admin|login|signup|auth|forgot-password|profile)/.test(url.pathname)) {
        cache.put(url.pathname, res.clone());
      }
    }
    return res;
  } catch {
    const url = new URL(request.url);
    return (await cache.match(url.pathname)) || (await cache.match("/offline")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (url.pathname.startsWith("/data/quran/")) {
    event.respondWith(cacheFirst(request, DATA_CACHE));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});

/** يخزّن الأصول (سكربتات وأنماط وخطوط) التي تشير إليها صفحة HTML لتعمل دون اتصال. */
async function cacheAssetsOf(html) {
  const cache = await caches.open(STATIC_CACHE);
  const urls = new Set();
  for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) urls.add(m[1]);
  await Promise.all(
    [...urls].map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch {}
    }),
  );
}

async function downloadQuran(client) {
  const data = await caches.open(DATA_CACHE);
  const pages = await caches.open(PAGES_CACHE);
  const total = 114 + OFFLINE_PAGES.length;
  let done = 0;
  let failed = 0;
  const post = (type) => client && client.postMessage({ type, done, total, failed });
  const tasks = [];
  for (let n = 1; n <= 114; n++) tasks.push({ data: `/data/quran/${n}.json`, page: `/quran/${n}` });
  for (const p of OFFLINE_PAGES) tasks.push({ page: p });
  let assetsCached = false;
  for (const t of tasks) {
    try {
      if (t.data && !(await data.match(t.data))) {
        const r = await fetch(t.data);
        if (!r.ok) throw new Error(String(r.status));
        await data.put(t.data, r);
      }
      const pr = await fetch(t.page, { headers: { Accept: "text/html" } });
      if (!pr.ok) throw new Error(String(pr.status));
      const html = await pr.clone().text();
      await pages.put(t.page, pr);
      if (!assetsCached || t.page === "/quran" || t.page === "/today" || t.page.startsWith("/adhkar")) {
        await cacheAssetsOf(html);
        assetsCached = true;
      }
    } catch {
      failed++;
    }
    done++;
    if (done % 4 === 0 || done === total) post("DOWNLOAD_PROGRESS");
  }
  if (!failed) await data.put("/__offline-ready", new Response(new Date().toISOString()));
  post("DOWNLOAD_DONE");
}

async function offlineStatus(client) {
  const data = await caches.open(DATA_CACHE);
  const keys = await data.keys();
  const surahs = keys.filter((k) => /\/data\/quran\/\d+\.json$/.test(k.url)).length;
  const ready = await data.match("/__offline-ready");
  client.postMessage({ type: "OFFLINE_STATUS", surahs, ready: !!ready, at: ready ? await ready.text() : null });
}

async function clearOffline(client) {
  await caches.delete(DATA_CACHE);
  await caches.delete(PAGES_CACHE);
  await caches.open(PAGES_CACHE).then((c) => c.addAll(PRECACHE));
  client.postMessage({ type: "OFFLINE_STATUS", surahs: 0, ready: false, at: null });
}

self.addEventListener("message", (event) => {
  const client = event.source;
  const type = event.data && event.data.type;
  if (type === "DOWNLOAD_QURAN") event.waitUntil(downloadQuran(client));
  if (type === "OFFLINE_STATUS") event.waitUntil(offlineStatus(client));
  if (type === "CLEAR_OFFLINE") event.waitUntil(clearOffline(client));
});
