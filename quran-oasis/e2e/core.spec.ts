import { expect, test } from "@playwright/test";
import { ayahText, state, trackErrors } from "./helpers";

test("الصفحة الرئيسية", async ({ page }) => {
  const t = trackErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("اجعل للقرآن مكانًا");
  await expect(page.getByRole("link", { name: "ابدأ رحلتك" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /تصفّح القرآن/ })).toBeVisible();
  // الآية التعريفية من النص المعتمد
  await expect(page.locator("figure blockquote")).toContainText(ayahText(13, 28));
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  t.expectClean();
});

test("البحث في السور والانتقال إلى آية وحفظ الموضع", async ({ page }) => {
  const t = trackErrors(page);
  await page.goto("/quran");
  await expect(page.locator("ul li a[href^='/quran/']")).toHaveCount(114);
  await page.getByRole("searchbox").fill("البقرة 255");
  await page.getByRole("link", { name: /انتقل إلى سورة البقرة/ }).click();
  await expect(page).toHaveURL(/\/quran\/2\?ayah=255/);
  await expect(page.getByRole("heading", { name: "سورة البقرة" })).toBeVisible();
  await expect(page.locator("#a-255")).toBeInViewport();
  await expect.poll(async () => (await state(page))?.lastRead?.ayah, { timeout: 8000 }).toBe(255);
  // استعادة آخر موضع عند العودة
  await page.goto("/quran/2");
  await expect(page.getByText(/عدتَ إلى آخر موضع/)).toBeVisible();
  await expect(page.locator("#a-255")).toBeInViewport();
  t.expectClean();
});

test("احتساب القراءة الفعلية والهدف اليومي", async ({ page }) => {
  await page.goto("/quran/1");
  await expect.poll(async () => JSON.stringify((await state(page))?.readingLog ?? {}), { timeout: 20000 }).toContain("[1,7]");
  await page.goto("/today");
  await expect(page.getByRole("progressbar", { name: "تقدم الهدف اليومي" })).toHaveAttribute("aria-valuenow", "50");
});

test("الفاتحة: سبع آيات والبسملة آيتها الأولى، والتوبة بلا بسملة", async ({ page }) => {
  await page.goto("/quran/1");
  await expect(page.locator("[data-ayah]")).toHaveCount(7);
  await expect(page.getByLabel("البسملة")).toHaveCount(0);
  await page.goto("/quran/9");
  await expect(page.locator("[data-ayah]")).toHaveCount(129);
  await expect(page.getByLabel("البسملة")).toHaveCount(0);
  await page.goto("/quran/112");
  await expect(page.getByLabel("البسملة")).toHaveCount(1);
});

test("خيارات الآية: المفضلة والعلامة والنسخ", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/quran/112");
  await page.locator("#a-1").click();
  const sheet = page.getByRole("dialog", { name: "خيارات الآية 1" });
  await sheet.getByRole("button", { name: "المفضلة" }).click();
  await expect(page.getByText("أُضيفت إلى المفضلة")).toBeVisible();
  await sheet.getByRole("button", { name: "علامة" }).click();
  await sheet.getByRole("button", { name: "نسخ" }).click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("[الإخلاص: ١]");
  expect(clip.startsWith("﴿")).toBe(true);
  await page.goto("/saved");
  await expect(page.getByText("سورة الإخلاص · الآية ١")).toBeVisible();
  await expect(page.getByText(/الآيات المفضلة \(١\)/)).toBeVisible();
});

test("عدّاد الأذكار يُحفظ ويُعاد ضبطه", async ({ page }) => {
  const t = trackErrors(page);
  await page.goto("/adhkar/after-prayer");
  const tasbih = page.locator("#p-tasbih");
  for (let i = 0; i < 3; i++) await tasbih.getByRole("button", { name: /عدّ التكرار/ }).click();
  await expect(tasbih.getByRole("button", { name: /عدّ التكرار، 3 من 33/ })).toBeVisible();
  await page.reload();
  await expect(page.locator("#p-tasbih").getByRole("button", { name: /عدّ التكرار، 3 من 33/ })).toBeVisible();
  await page.getByRole("button", { name: "إعادة الضبط" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "إعادة الضبط" }).click();
  await expect(page.locator("#p-tasbih").getByRole("button", { name: /عدّ التكرار، 0 من 33/ })).toBeVisible();
  // الأذكار القرآنية تُعرض من النص المعتمد
  await expect(page.locator("#p-kursi blockquote")).toContainText(ayahText(2, 255));
  t.expectClean();
});

test("اكتمال ذكر وإنجاز القسم", async ({ page }) => {
  await page.goto("/adhkar/waking");
  await page.locator("#w-ahyana").getByRole("button", { name: /عدّ التكرار/ }).click();
  await page.locator("#w-afani").getByRole("button", { name: /عدّ التكرار/ }).click();
  await expect(page.getByText(/أتممتَ أذكار الاستيقاظ لهذا اليوم/)).toBeVisible();
});

test("الخطة اليومية والختمة", async ({ page }) => {
  const t = trackErrors(page);
  await page.goto("/plan");
  await page.getByRole("button", { name: "+ أذكار الصباح" }).click();
  await page.getByRole("button", { name: "+ قراءة الورد اليومي" }).click();
  await page.getByLabel("مهمة مخصصة").fill("قراءة سورة الملك");
  await page.getByRole("button", { name: "إضافة مهمة" }).click();
  await expect(page.getByRole("checkbox", { name: "قراءة سورة الملك" })).toBeVisible();
  await page.getByRole("checkbox", { name: "قراءة سورة الملك" }).click();
  await expect(page.getByRole("checkbox", { name: "قراءة سورة الملك" })).toHaveAttribute("aria-checked", "true");
  // الهدف اليومي
  await page.getByRole("button", { name: "تعديل" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "5" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "حفظ" }).click();
  await expect(page.getByText(/هدفك: 5 صفحة يوميًا/)).toBeVisible();
  // ختمة
  await page.getByRole("button", { name: "60 يومًا" }).click();
  await expect(page.getByText(/نحو 10/)).toBeVisible();
  await page.getByRole("button", { name: "إنشاء الخطة" }).click();
  await expect(page.getByText("نشطة")).toBeVisible();
  await page.getByRole("button", { name: "إيقاف مؤقت" }).click();
  await expect(page.getByText("متوقفة مؤقتًا")).toBeVisible();
  // تسجيل يدوي
  await page.getByRole("button", { name: "تسجيل القراءة" }).click();
  await expect(page.getByText(/سُجّلت قراءة الفاتحة 1–7/)).toBeVisible();
  await page.goto("/today");
  await expect(page.getByRole("checkbox", { name: "قراءة سورة الملك" })).toHaveAttribute("aria-checked", "true");
  t.expectClean();
});

test("الحفظ والمراجعة", async ({ page }) => {
  await page.goto("/hifz");
  await page.getByLabel("السورة").selectOption("112");
  await page.getByLabel("إلى الآية").fill("4");
  await page.getByLabel("ملاحظات (اختياري)").fill("تشابه مع سورة الكافرون");
  await page.getByRole("button", { name: "تسجيل المقطع" }).click();
  await expect(page.getByText("سورة الإخلاص · الآيات ١–٤").first()).toBeVisible();
  await expect(page.getByText("لا مراجعات مستحقة اليوم")).toBeVisible();
  const s = await state(page);
  const seg = Object.values(s.hifz)[0] as { nextReview: string; from: number; to: number };
  expect(seg.from).toBe(1);
  expect(seg.to).toBe(4);
  // إدخال غير صالح
  await page.getByRole("button", { name: "مقطع جديد" }).click();
  await page.getByLabel("السورة").selectOption("112");
  await page.getByLabel("إلى الآية").fill("9");
  await expect(page.getByRole("button", { name: "تسجيل المقطع" })).toBeDisabled();
});

test("لحظة واحة: الفصل بين النص والتفسير والتأمل وحفظ الخاطرة", async ({ page }) => {
  await page.goto("/oasis");
  await expect(page.getByText("النص القرآني")).toBeVisible();
  await expect(page.getByText(/منقول من: التفسير الميسر/)).toBeVisible();
  await expect(page.getByText(/تأمل تحريري من فريق واحة القرآن، وليس تفسيرًا/)).toBeVisible();
  await page.getByRole("textbox").fill("خاطرة تجريبية");
  await page.getByRole("button", { name: "حفظ الخاطرة" }).click();
  await page.reload();
  await expect(page.getByRole("textbox")).toHaveValue("خاطرة تجريبية");
});

test("التعلّم: إكمال درس وتقدم المسار", async ({ page }) => {
  await page.goto("/learn/tajweed-basics/what-is-tajweed");
  await expect(page.locator("blockquote")).toContainText(ayahText(73, 4));
  await page.getByRole("button", { name: "أكملت الدرس" }).click();
  await page.goto("/learn/tajweed-basics");
  await expect(page.getByRole("progressbar", { name: "تقدم المسار" })).toHaveAttribute("aria-valuenow", "20");
});

test("وضع الزائر: الحسابات والإدارة بدون Supabase", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText(/خدمة الحسابات غير مفعّلة/)).toBeVisible();
  await page.goto("/admin");
  await expect(page.getByText("لوحة الإدارة غير مفعّلة")).toBeVisible();
});

test("الإعدادات: الوضع الداكن وحجم الخط والتصدير", async ({ page }) => {
  await page.goto("/profile");
  await page.getByRole("radio", { name: "داكن" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByLabel(/حجم خط المصحف/).fill("1.4");
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--quran-scale"))).toBe("1.4");
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "تصدير نسخة احتياطية" }).click();
  expect((await download).suggestedFilename()).toMatch(/^quran-oasis-\d{4}-\d{2}-\d{2}\.json$/);
});
