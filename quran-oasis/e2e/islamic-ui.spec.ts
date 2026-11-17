import { expect, test } from "@playwright/test";

test("الصفحة التعريفية تعرض المشكاة والمصحف دون تمرير أفقي", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("img", { name: "محراب إسلامي مزخرف يتوسطه مصحف مفتوح" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /اجعل للقرآن مكانًا/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /الخلوة/ }).first()).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflows).toBe(false);
});

test("لوحة اليوم تحافظ على الوصول السريع والتنقل على الهاتف", async ({ page }) => {
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "مساحات الواحة" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "وصول سريع" }).getByRole("link", { name: "المصحف" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "التنقل السفلي" })).toBeVisible();
  const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  expect(overflows).toBe(false);
});
