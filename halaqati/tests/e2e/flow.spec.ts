/**
 * Full halaqa workflow through the real UI on a phone-sized screen:
 * signup → independent halaqa → join request → approval → session,
 * attendance, recitation → student journey → parent link.
 * Requires a backend with email auto-confirm (local stack or a test project).
 */
import { expect, test, type Browser } from "@playwright/test";
import { expectNoHorizontalOverflow, register } from "./helpers";

const run = Date.now();
const email = (who: string) => `${who}.${run}@e2e.halaqati.test`;

async function newUser(browser: Browser) {
  const ctx = await browser.newContext({ ...test.info().project.use, baseURL: test.info().project.use.baseURL });
  return { ctx, page: await ctx.newPage() };
}

test.describe.serial("halaqa workflow", () => {
  let halaqaUrl = "";

  test("1–6, 14. teacher and student complete the core flow on mobile", async ({ browser }) => {
    test.skip(process.env.E2E_FLOW !== "1", "set E2E_FLOW=1 with a test backend");

    // Teacher signs up and creates a public independent halaqa.
    const teacher = await newUser(browser);
    await register(teacher.page, { name: "المحفّظ عبدالله", email: email("teacher"), roles: ["quran_teacher"] });
    await teacher.page.goto("/dashboard/teacher/halaqat/new");
    await expectNoHorizontalOverflow(teacher.page);
    await teacher.page.getByLabel("اسم الحلقة").fill(`حلقة الفجر ${run}`);
    await teacher.page.getByLabel("الحالة").selectOption("published");
    await teacher.page.getByRole("button", { name: "إنشاء الحلقة" }).click();
    await teacher.page.waitForURL(/\/dashboard\/teacher\/halaqat\/[0-9a-f-]{36}\?created=1/);
    const halaqaId = teacher.page.url().match(/halaqat\/([0-9a-f-]{36})/)![1];
    halaqaUrl = `/halaqat/${halaqaId}`;

    // Student signs up, finds it, and requests to join.
    const student = await newUser(browser);
    await register(student.page, { name: "الطالب يوسف", email: email("student"), roles: ["student"] });
    await student.page.goto(`/halaqat?q=${run}`);
    await student.page.getByRole("link", { name: `حلقة الفجر ${run}` }).click();
    await expectNoHorizontalOverflow(student.page);
    await student.page.getByLabel("رسالة للمحفّظ (اختياري)").fill("أحفظ جزء عم");
    await student.page.getByRole("button", { name: "طلب الانضمام" }).click();
    await expect(student.page.getByText("طلبك قيد المراجعة لدى المحفّظ")).toBeVisible();

    // Teacher accepts, adds a session, takes attendance, records a recitation.
    await teacher.page.goto(`/dashboard/teacher/halaqat/${halaqaId}`);
    await expect(teacher.page.getByText("«أحفظ جزء عم»")).toBeVisible();
    await teacher.page.getByRole("button", { name: "قبول" }).click();
    await expect(teacher.page.getByRole("link", { name: "الطالب يوسف" })).toBeVisible();
    await teacher.page.getByText("إضافة جلسة").click();
    await teacher.page.getByLabel("رابط الاجتماع (للأعضاء فقط)").fill("https://meet.example.org/fajr");
    await teacher.page.getByRole("button", { name: "إضافة الجلسة" }).click();
    await teacher.page.waitForURL(/\/dashboard\/teacher\/sessions\//);
    await expectNoHorizontalOverflow(teacher.page);
    await teacher.page.getByRole("radio", { name: "حاضر" }).check();
    await teacher.page.getByRole("button", { name: "حفظ الحضور" }).click();
    await expect(teacher.page.getByText("تم حفظ حضور 1 طالب.")).toBeVisible();

    await teacher.page.getByRole("link", { name: "تسجيل تسميع" }).click();
    await teacher.page.locator("#rec-surahFrom").selectOption("78");
    await teacher.page.locator("#rec-ayahFrom").fill("1");
    await teacher.page.locator("#rec-ayahTo").fill("16");
    await expect(teacher.page.getByText("المقدار: 16 آية")).toBeVisible();
    await teacher.page.locator("#rec-mastery").selectOption("4");
    await teacher.page.locator("#rec-recitation").selectOption("3");
    await teacher.page.getByRole("button", { name: "إضافة خطأ" }).click();
    await teacher.page.getByLabel("نوع الخطأ 1").selectOption("tajweed");
    await teacher.page.getByRole("button", { name: "اعتماد التسميع" }).click();
    await expect(teacher.page.getByText("تم اعتماد التسميع.")).toBeVisible();
    await expectNoHorizontalOverflow(teacher.page);

    // Review on the same day.
    await teacher.page.locator("#rec-activity").selectOption("far_review");
    await teacher.page.locator("#rec-surahFrom").selectOption("112");
    await teacher.page.locator("#rec-ayahFrom").fill("1");
    await teacher.page.locator("#rec-surahTo").selectOption("114");
    await teacher.page.locator("#rec-ayahTo").fill("6");
    await teacher.page.locator("#rec-mastery").selectOption("5");
    await teacher.page.getByRole("button", { name: "اعتماد التسميع" }).click();
    await expect(teacher.page.getByText("تم اعتماد التسميع.")).toBeVisible();

    // Students table and a certificate with public verification.
    await teacher.page.goto(`/dashboard/teacher/halaqat/${halaqaId}/students`);
    await expect(teacher.page.getByRole("table")).toContainText("16 آية");
    await expectNoHorizontalOverflow(teacher.page);
    await teacher.page.getByRole("link", { name: "الطالب يوسف" }).click();
    await teacher.page.getByText("إصدار شهادة إنجاز").click();
    await teacher.page.locator("#cert-title").fill("إتمام حفظ سورة النبأ");
    await teacher.page.getByRole("button", { name: "إصدار الشهادة" }).click();
    await expect(teacher.page.getByText("تم إصدار الشهادة وإشعار الطالب.")).toBeVisible();
    const certLink = teacher.page.getByRole("link", { name: /عرض الشهادة HQ-/ });
    const certHref = (await certLink.getAttribute("href"))!;
    const anon = await browser.newContext({ ...test.info().project.use });
    const anonPage = await anon.newPage();
    await anonPage.goto(certHref);
    await expect(anonPage.getByText("✓ شهادة صحيحة صادرة عبر منصة حلقتي.")).toBeVisible();
    await expect(anonPage.getByRole("heading", { name: "إتمام حفظ سورة النبأ" })).toBeVisible();
    await expect(anonPage.getByText("ا***")).toBeVisible(); // name masked by default
    await expectNoHorizontalOverflow(anonPage);
    await anon.close();

    // Student sees the approved records in their journey.
    await student.page.goto("/dashboard/journey");
    await expect(student.page.getByText("حفظ جديد: النبأ 1–16")).toBeVisible();
    await expect(student.page.getByText("مراجعة بعيدة: الإخلاص 1 ← الناس 6")).toBeVisible();
    await expectNoHorizontalOverflow(student.page);
    await student.page.goto("/dashboard/sessions");
    await expect(student.page.getByText("حاضر")).toBeVisible();

    await student.page.goto("/dashboard/schedule");
    await expect(student.page.getByRole("heading", { name: "جدولي الأسبوعي" })).toBeVisible();
    await expectNoHorizontalOverflow(student.page);
    await student.page.goto("/dashboard/certificates");
    await expect(student.page.getByRole("heading", { name: "إتمام حفظ سورة النبأ" })).toBeVisible();

    // Motivation: approved recitation + attendance already earned points; streak is live.
    await student.page.goto("/dashboard");
    await expect(student.page.getByText("الحماسة", { exact: true })).toBeVisible();
    await student.page.locator("#wird-pages").fill("4");
    await student.page.getByRole("button", { name: "سجّل الورد" }).click();
    await expect(student.page.getByText("سجّلت وردك اليوم: 4 صفحة")).toBeVisible();
    await expectNoHorizontalOverflow(student.page);

    // Personal tasks.
    await student.page.goto("/dashboard/tasks");
    await student.page.locator("#task-title").fill("مراجعة سورة الملك");
    await student.page.getByRole("button", { name: "إضافة" }).click();
    await expect(student.page.getByText("أُضيفت المهمة")).toBeVisible();
    await student.page.getByRole("button", { name: "إنجاز: مراجعة سورة الملك" }).click();
    await expect(student.page.getByRole("button", { name: "إلغاء إنجاز: مراجعة سورة الملك" })).toBeVisible();

    // League shows the student with their points.
    await student.page.goto("/dashboard/league");
    await expect(student.page.getByText("(أنت)")).toBeVisible();
    await expectNoHorizontalOverflow(student.page);

    // Stats charts render with a table view.
    await student.page.goto("/dashboard/stats");
    await expect(student.page.getByText("النقاط أسبوعيًا")).toBeVisible();
    await expectNoHorizontalOverflow(student.page);

    // Teacher encourages the record; the student is notified.
    await teacher.page.goto(`/dashboard/teacher/halaqat/${halaqaId}/students`);
    await teacher.page.getByRole("link", { name: "الطالب يوسف" }).click();
    await teacher.page.getByRole("button", { name: "ما شاء الله" }).first().click();
    await expect(teacher.page.getByRole("button", { name: "ما شاء الله (1)" }).first()).toHaveAttribute("aria-pressed", "true");
    await student.page.goto("/dashboard/notifications");
    await expect(student.page.locator("#main").getByText(/ما شاء الله/)).toBeVisible();

    // Settings page offers push, install and theme.
    await student.page.goto("/dashboard/settings");
    await expect(student.page.getByRole("heading", { name: "إشعارات الجهاز" })).toBeVisible();
    await expect(student.page.getByRole("heading", { name: "تثبيت التطبيق" })).toBeVisible();
    await student.page.goto("/dashboard/support");
    await student.page.getByLabel("العنوان").fill("استفسار");
    await student.page.getByLabel("التفاصيل").fill("كيف أغيّر موعد الحلقة؟");
    await student.page.getByRole("button", { name: "إرسال" }).click();
    await expect(student.page.getByText("تم استلام بلاغك")).toBeVisible();

    // 7. The student cannot open the teacher's management pages.
    await student.page.goto(`/dashboard/teacher/halaqat/${halaqaId}`);
    await expect(student.page).toHaveURL(/\/dashboard$/);

    // 8. Parent links only through the student's code.
    await student.page.goto("/dashboard/profile");
    await student.page.getByRole("button", { name: "إنشاء رمز ربط وليّ الأمر" }).click();
    const code = (await student.page.locator("p.font-mono").innerText()).trim();
    expect(code).toMatch(/^[A-Z2-9]{10}$/);

    const parent = await newUser(browser);
    await register(parent.page, { name: "وليّ الأمر أحمد", email: email("parent"), roles: ["parent"] });
    await parent.page.goto("/dashboard/children");
    await parent.page.getByLabel("رمز الربط").fill(code);
    await parent.page.getByRole("button", { name: "ربط", exact: true }).click();
    await expect(parent.page.getByText("تم ربط الابن بحسابك.")).toBeVisible();
    await parent.page.getByRole("link", { name: "الطالب يوسف" }).click();
    await expect(parent.page.getByText("حفظ جديد: النبأ 1–16")).toBeVisible();
    await expectNoHorizontalOverflow(parent.page);

    await Promise.all([teacher.ctx.close(), student.ctx.close(), parent.ctx.close()]);
  });

  test("1. a registered user can sign out and sign back in", async ({ page }) => {
    test.skip(process.env.E2E_FLOW !== "1", "set E2E_FLOW=1 with a test backend");
    await page.goto("/login");
    await page.getByLabel("البريد الإلكتروني").fill(email("student"));
    await page.getByLabel("كلمة المرور").fill("wrong-password1");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await expect(page.getByText("البريد الإلكتروني أو كلمة المرور غير صحيحة.")).toBeVisible();
    await page.getByLabel("كلمة المرور").fill("Halaqati2026");
    await page.getByRole("button", { name: "تسجيل الدخول" }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { name: "الطالب يوسف" })).toBeVisible();
    // Sign out from the account menu (desktop) or the "more" sheet (phone).
    if (await page.locator(".tabbar").isVisible()) {
      await page.getByRole("button", { name: "المزيد" }).click();
      await page.getByRole("dialog", { name: "المزيد" }).getByRole("button", { name: "خروج" }).click();
    } else {
      await page.getByLabel("قائمة الحساب").click();
      await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    }
    await page.waitForURL((u) => u.pathname === "/");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect(halaqaUrl).not.toBe("");
  });
});
