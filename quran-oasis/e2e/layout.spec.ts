import { expect, test } from "@playwright/test";

const PAGES = ["/", "/today", "/quran", "/quran/2", "/adhkar", "/adhkar/morning", "/oasis", "/plan", "/hifz", "/learn", "/stats", "/saved", "/profile", "/sources", "/privacy"];

test("لا تمرير أفقي ولا أخطاء في الصفحات الرئيسية", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const p of PAGES) {
    await page.goto(p);
    await page.waitForLoadState("load");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, p).toBeLessThanOrEqual(1);
    await expect(page.locator("h1").first(), p).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("التنقل: الشريط السفلي على الهاتف أو القائمة العلوية على الحاسوب", async ({ page, viewport }) => {
  await page.goto("/today");
  if ((viewport?.width ?? 0) < 1024) {
    const bottom = page.getByRole("navigation", { name: "التنقل السفلي" });
    await expect(bottom).toBeVisible();
    await bottom.getByRole("button", { name: "المزيد" }).click();
    await page.getByRole("navigation", { name: "أقسام إضافية" }).getByRole("link", { name: "الحفظ والمراجعة" }).click();
    await expect(page).toHaveURL(/\/hifz/);
  } else {
    const top = page.getByRole("navigation", { name: "التنقل الرئيسي" });
    await expect(top).toBeVisible();
    await top.getByRole("link", { name: "القرآن" }).click();
    await expect(page).toHaveURL(/\/quran$/);
  }
});

test("لوحة المفاتيح: تخطي إلى المحتوى وتحديد آية", async ({ page }) => {
  await page.goto("/quran/1");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "تخطَّ إلى المحتوى" })).toBeFocused();
  await page.locator("#a-2").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "خيارات الآية 2" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog", { name: "خيارات الآية 3" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
