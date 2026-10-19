import { expect, test } from "@playwright/test";
import { expectNoHorizontalOverflow } from "./helpers";

const PAGES = [
  { path: "/", heading: /حلقتي/ },
  { path: "/halaqat", heading: "الحلقات القرآنية" },
  { path: "/teachers", heading: "دليل المحفّظين والمعلمين" },
  { path: "/centers", heading: "الدور والمراكز الموثقة" },
  { path: "/about", heading: "عن حلقتي" },
  { path: "/privacy", heading: "سياسة الخصوصية" },
  { path: "/terms", heading: "شروط الاستخدام" },
  { path: "/login", heading: "تسجيل الدخول" },
  { path: "/register", heading: "إنشاء حساب" },
  { path: "/forgot-password", heading: "استعادة كلمة المرور" },
  { path: "/verify", heading: "التحقق من شهادة" },
  { path: "/app", heading: "ثبّت حلقتي على هاتفك" },
];

test.describe("14. public pages work on this screen size", () => {
  for (const p of PAGES) {
    test(`${p.path} renders RTL Arabic without horizontal scroll`, async ({ page }) => {
      const res = await page.goto(p.path);
      expect(res?.status()).toBeLessThan(400);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("html")).toHaveAttribute("lang", "ar");
      await expect(page.getByRole("heading", { level: 1, name: p.heading })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    });
  }

  test("the official logo is displayed", async ({ page }) => {
    await page.goto("/");
    const logo = page.getByRole("img", { name: "شعار حلقتي" }).first();
    await expect(logo).toBeVisible();
    expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  });

  test("private pages redirect anonymous visitors to login", async ({ page }) => {
    await page.goto("/dashboard/journey");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fjourney/);
  });

  test("the app is installable (web manifest)", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBe(true);
    const m = await res.json();
    expect(m).toMatchObject({ short_name: "حلقتي", dir: "rtl", lang: "ar", display: "standalone" });
    expect((await request.get("/sw.js")).ok()).toBe(true);
  });

  test("security headers are sent", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});
