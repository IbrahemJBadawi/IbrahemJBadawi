import { spawn, type ChildProcess } from "node:child_process";
import { expect, test } from "@playwright/test";
import { ayahText } from "./helpers";

/**
 * اختبار حقيقي للعمل دون اتصال: نشغّل خادمًا مستقلًا، ننزّل المصحف، ثم نُوقف الخادم كليًا.
 * (محاكاة setOffline في Playwright لا تشمل طلبات الـ Service Worker، لذا لا تكفي وحدها.)
 */
const PORT = 3299;
const BASE = `http://localhost:${PORT}`;
let server: ChildProcess | null = null;

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start");
}

test.afterAll(() => {
  server?.kill("SIGTERM");
});

test("تنزيل المصحف والقراءة دون اتصال", async ({ page }) => {
  test.setTimeout(150_000);
  server = spawn("npx", ["next", "start", "-p", String(PORT)], { stdio: "ignore", detached: true });
  await waitUp();

  await page.goto(`${BASE}/profile`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // ليصبح الـ SW متحكمًا في الصفحة
  await page.getByRole("button", { name: "تنزيل المصحف للقراءة دون اتصال" }).click();
  await expect(page.getByText(/المصحف متاح دون اتصال على هذا الجهاز/)).toBeVisible({ timeout: 120_000 });

  // إيقاف الخادم كليًا = انقطاع حقيقي
  process.kill(-server.pid!, "SIGTERM");
  server = null;
  await expect.poll(async () => fetch(BASE).then(() => "up", () => "down"), { timeout: 15_000 }).toBe("down");

  await page.goto(`${BASE}/quran/36`);
  await expect(page.getByRole("heading", { name: "سورة يس" })).toBeVisible();
  await expect(page.locator("[data-ayah]")).toHaveCount(83);

  // الأذكار القرآنية تُحمّل نصها من الذاكرة المحلية
  await page.goto(`${BASE}/adhkar/evening`);
  await expect(page.locator("#e-kursi blockquote")).toContainText(ayahText(2, 255));

  // صفحة لم تُخزّن: تظهر صفحة "غير متصل" بدل محتوى غير موجود
  await page.goto(`${BASE}/learn/hifz-planning/keep-hifz`);
  await expect(page.getByRole("heading", { name: "أنت غير متصل بالإنترنت" })).toBeVisible();
});
