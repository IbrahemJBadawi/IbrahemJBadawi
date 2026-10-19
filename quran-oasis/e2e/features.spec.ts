import { expect, test } from "@playwright/test";
import { state } from "./helpers";

test.describe("الزائر الجديد", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("الإعداد الأولي يحفظ الهدف والمهام ثم يفتح لوحة اليوم", async ({ page }) => {
    await page.goto("/today");
    await expect(page).toHaveURL(/\/welcome/);
    await expect(page.getByRole("heading", { name: "أهلًا بك في واحتك" })).toBeVisible();
    await page.getByRole("button", { name: "التالي" }).click();
    await page.getByRole("radio", { name: /٥ صفحات/ }).click();
    await page.getByRole("button", { name: "التالي" }).click();
    await page.getByRole("button", { name: /المسبحة|لحظة واحة/ }).first().click();
    await page.getByRole("button", { name: "التالي" }).click();
    await page.getByRole("button", { name: "الرياض السعودية" }).click();
    await expect(page.getByText("✓ حُدّد موقعك بنجاح")).toBeVisible();
    await page.getByRole("button", { name: "ابدأ رحلتك" }).click();
    await expect(page).toHaveURL(/\/today$/);
    await expect(page.getByLabel("الصلاة القادمة")).toContainText(/الصلاة القادمة/);
    const s = await state(page);
    expect(s.settings.dailyGoal).toMatchObject({ enabled: true, amount: 5 });
    expect(Object.keys(s.tasks).length).toBeGreaterThanOrEqual(3);
    // لا يعود للإعداد الأولي بعد ذلك
    await page.reload();
    await expect(page).toHaveURL(/\/today$/);
  });
});

test("مواقيت الصلاة لمدينة مختارة، ومتابعة الصلاة، والقبلة", async ({ page }) => {
  await page.goto("/prayer");
  await page.getByLabel("أو اختر مدينتك").fill("القاهرة");
  await page.getByRole("button", { name: "القاهرة مصر" }).click();
  await expect(page.getByText("مواقيت اليوم")).toBeVisible();
  for (const name of ["الفجر", "الشروق", "الظهر", "العصر", "المغرب", "العشاء"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByLabel("طريقة الحساب")).toHaveValue("Egyptian");
  await page.getByRole("checkbox", { name: "صليتُ الفجر" }).click();
  await expect(page.getByRole("checkbox", { name: "صليتُ الفجر" })).toHaveAttribute("aria-checked", "true");
  const device = await page.evaluate(() => JSON.parse(localStorage.getItem("qo:device:v1")!));
  expect(device.location).toMatchObject({ label: "القاهرة", tz: "Africa/Cairo" });
  await page.goto("/qibla");
  await expect(page.getByText("136°")).toBeVisible(); // القاهرة ≈ 136°
});

test("المسبحة: العدّ والدورات والتصفير", async ({ page }) => {
  await page.goto("/tasbih");
  const tap = page.locator("#tasbih-tap");
  for (let i = 0; i < 35; i++) await tap.click();
  await expect(page.getByText("أتممتَ ٣٣")).toBeVisible();
  await expect(page.getByText("دورات مكتملة").locator("..")).toContainText("١");
  await page.reload();
  await expect(page.getByText("هذا الذكر اليوم").locator("..")).toContainText("٣٥");
  await page.keyboard.press("Space");
  await expect(page.getByText("هذا الذكر اليوم").locator("..")).toContainText("٣٦");
  await page.getByRole("button", { name: "تصفير" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "تصفير" }).click();
  await expect(page.getByText("هذا الذكر اليوم").locator("..")).toContainText("٠");
});

test("الحفظ المحلي: الاستعادة التلقائية بعد مسح localStorage، والتصدير والاستيراد", async ({ page }) => {
  await page.goto("/quran/112");
  await page.locator("#a-1").click();
  await page.getByRole("dialog", { name: "خيارات الآية 1" }).getByRole("button", { name: "المفضلة" }).click();
  await page.goto("/profile");
  await expect(page.getByText("مع نسخة احتياطية تلقائية داخل المتصفح")).toBeVisible();
  await page.waitForTimeout(1500); // مهلة المرآة إلى IndexedDB

  // محاكاة مسح التخزين السريع (مثل تنظيف المتصفح)
  await page.evaluate(() => localStorage.removeItem("qo:state:v1"));
  await page.reload();
  await expect(page.getByText(/استُعيدت بياناتك تلقائيًا/)).toBeVisible();
  expect(Object.keys((await state(page)).bookmarks)).toContain("fav:112:1");

  // تصدير
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "تصدير نسخة احتياطية" }).click();
  const file = await (await dl).path();

  // مسح كامل ثم استيراد
  await page.getByRole("button", { name: "مسح البيانات المحلية" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "مسح" }).click();
  await expect.poll(async () => Object.keys((await state(page)).bookmarks).length).toBe(0);
  await page.getByLabel("ملف النسخة الاحتياطية").setInputFiles(file!);
  await page.getByRole("button", { name: /دمج مع بياناتي/ }).click();
  await expect(page.getByText("دُمجت النسخة مع بياناتك الحالية")).toBeVisible();
  expect(Object.keys((await state(page)).bookmarks)).toContain("fav:112:1");

  // ملف غير صالح
  await page.getByLabel("ملف النسخة الاحتياطية").setInputFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"a":1}') });
  await expect(page.getByText("هذا الملف ليس نسخة احتياطية من واحة القرآن.")).toBeVisible();
});

test("مسار التعلّم على شكل خريطة", async ({ page }) => {
  await page.goto("/learn/tajweed-basics");
  const path = page.getByRole("list", { name: "مسار الدروس" });
  await expect(path.getByRole("link")).toHaveCount(5);
  await expect(path.getByRole("link").first()).toHaveAccessibleName(/التالي/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
