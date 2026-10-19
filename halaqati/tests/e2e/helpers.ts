import { expect, type Page } from "@playwright/test";

/** No horizontal scrolling — the page fits the screen width. */
export async function expectNoHorizontalOverflow(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
  expect(scroll, "page should not scroll horizontally").toBeLessThanOrEqual(width + 1);
}

export async function register(page: Page, opts: { name: string; email: string; roles: string[] }) {
  await page.goto("/register");
  await page.getByLabel("الاسم الكامل").fill(opts.name);
  await page.getByLabel("البريد الإلكتروني").fill(opts.email);
  await page.getByLabel("كلمة المرور").fill("Halaqati2026");
  for (const role of ["student", "parent", "quran_teacher"]) {
    const box = page.locator(`input[name=roles][value=${role}]`);
    if (opts.roles.includes(role)) await box.check();
    else await box.uncheck();
  }
  await page.locator("input[name=acceptTerms]").check();
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await page.waitForURL("**/dashboard");
}
