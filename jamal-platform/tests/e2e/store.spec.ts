import { execFileSync } from "node:child_process";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Full Palestinian order-to-cash flow on a small phone screen, demo data only.
 * Requires: Postgres DATABASE_URL, `npm run db:migrate && npm run seed:demo`, a production build.
 */
test.use({ viewport: { width: 360, height: 740 } });

const stamp = Date.now();
const customerEmail = `customer.${stamp}@example.com`;
const adminEmail = `admin.${stamp}@example.com`;
const password = "Test-password-123";
const phone = `0599${String(stamp).slice(-6)}`;
// 1×1 PNG used as a fake transfer receipt (demo only).
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("الاسم الكامل").fill(name);
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("button", { name: "تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function noHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
}

const card = (page: Page, title: RegExp): Locator => page.locator("section").filter({ has: page.getByRole("heading", { name: title }) }).first();

test.describe.serial("Al Jamal — Palestine order flow", () => {
  let orderUrl = "";
  let orderNumber = "";
  let adminOrderUrl = "";

  test("18. Arabic RTL storefront works on a small phone", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { name: /أناقة هادئة/ })).toBeVisible();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "الملابس النسائية" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "الملابس النسائية" })).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("1. customer places an order without paying (prices from the server)", async ({ page }) => {
    await page.goto("/product/demo-linen-midi-dress");
    await expect(page.getByText("نؤكد التوفر والمقاس والسعر النهائي")).toBeVisible();
    await page.getByRole("button", { name: "بيج" }).click();
    await page.getByRole("button", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "أضف إلى السلة" }).click();
    await page.goto("/checkout");
    await expect(page.getByText("لا تدفع الآن")).toBeVisible();
    await page.getByLabel("الاسم الكامل").fill("عميلة تجريبية");
    await page.getByLabel(/رقم الهاتف/).fill(phone);
    await page.getByLabel("المحافظة").selectOption({ label: "رام الله والبيرة" });
    await page.getByLabel("المدينة / البلدة").fill("البيرة");
    await page.getByLabel("العنوان التفصيلي").fill("شارع القدس، عمارة 5");
    // 165 ₪ dress + 20 ₪ demo delivery fee for Ramallah
    await expect(page.getByText("₪").first()).toBeVisible();
    await expect(page.getByText("تحويل بنكي بعد اعتماد الطلب")).toBeVisible();
    await page.getByRole("checkbox").check();
    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "إرسال الطلب" }).click();
    await expect(page).toHaveURL(/\/order\/JM\d{6}-[A-Z0-9]{6}\?t=/);
    orderUrl = page.url().replace("&new=1", "");
    orderNumber = decodeURIComponent(new URL(orderUrl).pathname.split("/").pop()!);
    await expect(page.getByText("تم استلام طلبك").first()).toBeVisible();
    await expect(page.getByText("لا تحوّل أي مبلغ الآن")).toBeVisible();
    await expect(page.getByRole("heading", { name: "تعليمات التحويل البنكي" })).toHaveCount(0);
  });

  test("17. order data is protected: wrong token or phone reveals nothing; customers cannot open the admin", async ({ page }) => {
    await page.goto(`/order/${orderNumber}?t=wrong-token`);
    await expect(page.getByText("لا يمكن عرض هذا الطلب")).toBeVisible();
    await page.goto(`/track?n=${orderNumber}&p=0599000000`);
    await expect(page.getByText("لم نجد طلبًا")).toBeVisible();
    await register(page, "عميل آخر", customerEmail);
    await page.goto("/admin");
    await expect(page.getByText(/غير موجودة/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "الملخص" })).toHaveCount(0);
  });

  test("2–3. admin confirms stock with the supplier and approves the final price", async ({ page }) => {
    await register(page, "مدير المنصة", adminEmail);
    execFileSync("npx", ["tsx", "scripts/grant-admin.ts", adminEmail], { env: process.env, stdio: "pipe" });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "الملخص" })).toBeVisible();
    await noHorizontalOverflow(page);
    await page.goto(`/admin/orders?tests=1&q=${orderNumber}`);
    await page.getByRole("link", { name: orderNumber }).click();
    await page.waitForURL(/\/admin\/orders\/[0-9a-f-]{36}$/);
    adminOrderUrl = page.url();
    const stock = card(page, /التوفر والسعر لدى المورد/);
    // Approval is refused while stock is unconfirmed.
    await stock.getByRole("button", { name: /اعتماد السعر/ }).click();
    await expect(stock.getByText(/أكّد توفر كل المنتجات/).first()).toBeVisible();
    await stock.getByLabel("حالة التوفر").selectOption("available");
    await stock.getByRole("button", { name: "حفظ" }).first().click();
    await expect(stock.getByText("تم حفظ حالة التوفر.")).toBeVisible();
    await stock.getByLabel("خصم").fill("5");
    await stock.getByRole("button", { name: /اعتماد السعر/ }).click();
    await expect(page.getByText(/تم اعتماد السعر النهائي/).first()).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("4–5. customer uploads a proof; admin rejects an incorrect one", async ({ page }) => {
    await page.goto(orderUrl);
    await expect(page.getByRole("heading", { name: "تعليمات التحويل البنكي" })).toBeVisible();
    await expect(page.getByText("الإجمالي النهائي المعتمد")).toBeVisible();
    await page.locator('input[name="file"]').setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: PNG });
    await page.getByLabel("رقم مرجع الحوالة (إن وجد)").fill("TX-WRONG");
    await page.getByRole("button", { name: "إرسال الإثبات" }).click();
    await expect(page.getByText(/تم استلام الإثبات وهو قيد المراجعة/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("إثبات الدفع قيد المراجعة").first()).toBeVisible();
    await expect(page.getByText("مدفوع ومؤكد")).toHaveCount(0);

    await login(page, adminEmail);
    await page.goto(adminOrderUrl);
    const payment = card(page, /الدفع والتحقق من التحويل/);
    await expect(payment.getByRole("link", { name: /عرض الملف/ })).toBeVisible();
    await payment.getByLabel("سبب الرفض (يظهر للعميل)").fill("المبلغ لا يظهر في كشف الحساب");
    await payment.getByRole("button", { name: "رفض الإثبات" }).click();
    await expect(payment.getByText("سبب الرفض: المبلغ لا يظهر في كشف الحساب")).toBeVisible();

    await page.goto(orderUrl);
    await expect(page.getByText("سبب الرفض: المبلغ لا يظهر في كشف الحساب")).toBeVisible();
    await expect(page.getByText("بانتظار التحويل البنكي").first()).toBeVisible();
  });

  test("6. admin confirms the money actually arrived", async ({ page }) => {
    await page.goto(orderUrl);
    await page.getByLabel("رقم مرجع الحوالة (إن وجد)").fill("TX-OK-777");
    await page.getByRole("button", { name: "إرسال الإثبات" }).click();
    await expect(page.getByText(/تم استلام الإثبات/)).toBeVisible();

    await login(page, adminEmail);
    await page.goto(adminOrderUrl);
    const payment = card(page, /الدفع والتحقق من التحويل/);
    await payment.getByLabel("مرجع الحركة في كشف الحساب").fill("BOP-2026-1");
    await payment.getByRole("button", { name: "تأكيد وصول المبلغ" }).click();
    await expect(payment.getByText(/تحققت من وصول المبلغ/).first()).toBeVisible();
    await payment.getByLabel("تحققت بنفسي من وصول المبلغ إلى الحساب").first().check();
    await payment.getByRole("button", { name: "تأكيد وصول المبلغ" }).click();
    await expect(payment.getByText(/وصل فعليًا/)).toBeVisible();
    await page.reload();
    await expect(page.getByText("الدفع: مدفوع ومؤكد")).toBeVisible();
  });

  test("8–12. supplier settlement, sending to supplier, tracking, explicit delivery, profit", async ({ page }) => {
    await login(page, adminEmail);
    await page.goto(adminOrderUrl);
    const ful = card(page, /التنفيذ:/);
    await ful.getByLabel("تكلفة التوصيل الفعلية").fill("15");
    await ful.getByLabel("حالة التنفيذ/الشحنة").selectOption("sent_to_supplier");
    await ful.getByRole("button", { name: "حفظ التنفيذ والشحن" }).click();
    await expect(page.getByText("تم حفظ سجل التنفيذ والشحن.")).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await ful.getByLabel("الحالة", { exact: true }).selectOption("paid");
    await ful.getByRole("button", { name: "حفظ التسوية" }).click();
    await expect(page.getByText(/أدخل المبلغ المحوّل وتاريخ التحويل ومرجعه/)).toBeVisible();
    await ful.getByLabel("تاريخ التحويل").fill("2026-10-18");
    await ful.getByLabel("مرجع التحويل").fill("SUP-TR-1");
    page.once("dialog", (d) => d.accept());
    await ful.getByRole("button", { name: "حفظ التسوية" }).click();
    await expect(page.getByText("تم حفظ تسوية المورد.")).toBeVisible();

    const status = card(page, /تغيير الحالة/);
    await status.getByLabel("الحالة الجديدة").selectOption("processing");
    await status.getByRole("button", { name: "تحديث الحالة" }).click();
    await expect(page.getByText("تم تحديث حالة الطلب.")).toBeVisible();

    await ful.getByLabel("حالة التنفيذ/الشحنة").selectOption("shipped");
    await ful.getByLabel("شركة التوصيل").fill("توصيل تجريبي");
    await ful.getByLabel(/رقم التتبع/).fill("PS-TRACK-42");
    await ful.getByRole("button", { name: "حفظ التنفيذ والشحن" }).click();
    await expect(page.getByText("تم حفظ سجل التنفيذ والشحن.")).toBeVisible();
    await page.reload();
    await card(page, /تغيير الحالة/).getByLabel("الحالة الجديدة").selectOption("shipped");
    await card(page, /تغيير الحالة/).getByRole("button", { name: "تحديث الحالة" }).click();
    await expect(page.getByText("تم تحديث حالة الطلب.")).toBeVisible();

    // A tracking number alone is not delivery.
    await page.goto(orderUrl);
    await expect(page.getByText("PS-TRACK-42")).toBeVisible();
    await expect(page.getByText("تم الشحن").first()).toBeVisible();
    await expect(page.getByText("طلب إرجاع أو استبدال")).toHaveCount(0);

    await page.goto(adminOrderUrl);
    await card(page, /تغيير الحالة/).getByLabel("الحالة الجديدة").selectOption("delivered");
    await card(page, /تغيير الحالة/).getByRole("button", { name: "تحديث الحالة" }).click();
    await expect(page.getByText("تم تحديث حالة الطلب.")).toBeVisible();
    await page.reload();
    const fin = card(page, /الحسابات المالية/);
    await expect(fin.getByText(/الربح الفعلي:/)).toBeVisible();
    await expect(fin.getByText("غير محسوب بعد")).toHaveCount(0);
    await noHorizontalOverflow(page);

    await page.goto(orderUrl);
    await expect(page.getByText("تم التسليم").first()).toBeVisible();
    await expect(page.getByText("طلب إرجاع أو استبدال")).toBeVisible();
  });

  test("invoice is issued only after the payment was confirmed", async ({ page }) => {
    await page.goto(orderUrl);
    await page.getByRole("link", { name: "عرض الفاتورة" }).click();
    await expect(page.getByText(/فاتورة INV-\d{4}-\d{6}/)).toBeVisible();
    await expect(page.getByText("فاتورة مبيعات — ليست فاتورة ضريبية")).toBeVisible();
    await noHorizontalOverflow(page);
  });

  test("guest support ticket: staff reply is visible, internal note is not", async ({ page, browser }) => {
    const guest = await browser.newPage({ viewport: { width: 360, height: 740 } });
    await guest.goto("/support");
    await guest.getByLabel("الاسم", { exact: true }).fill("زائرة تجريبية");
    await guest.getByLabel("رقم الهاتف").fill("0599111222");
    await guest.getByLabel("نوع المشكلة").selectOption("product");
    await guest.getByLabel("العنوان", { exact: true }).fill("سؤال عن المقاس");
    await guest.getByLabel("التفاصيل").fill("هل المقاس M يناسب طول 165 سم؟");
    await guest.getByRole("button", { name: "إرسال التذكرة" }).click();
    await expect(guest).toHaveURL(/\/support\/TK-\d+\?t=/);
    await expect(guest.getByText(/تم فتح التذكرة/)).toBeVisible();
    const ticketUrl = guest.url().replace("&new=1", "");
    const code = new URL(ticketUrl).pathname.split("/").pop()!;
    await noHorizontalOverflow(guest);

    await login(page, adminEmail);
    await page.goto("/admin/tickets");
    await page.getByRole("link", { name: new RegExp(code) }).click();
    await page.getByLabel("الرد").fill("ملاحظة سرية للفريق فقط");
    await page.getByLabel("ملاحظة داخلية (لا يراها العميل)").check();
    await page.getByRole("button", { name: "إرسال", exact: true }).click();
    await expect(page.getByText("ملاحظة سرية للفريق فقط")).toBeVisible();
    await page.getByLabel("الرد").fill("نعم، المقاس M مناسب غالبًا");
    await page.getByRole("button", { name: "إرسال", exact: true }).click();
    await expect(page.getByText("نعم، المقاس M مناسب غالبًا")).toBeVisible();
    await noHorizontalOverflow(page);

    await guest.goto(ticketUrl);
    await expect(guest.getByText("نعم، المقاس M مناسب غالبًا")).toBeVisible();
    await expect(guest.getByText("ملاحظة سرية للفريق فقط")).toHaveCount(0);
    await guest.goto(`/support/${code}?t=wrong`);
    await expect(guest.getByText("لا يمكن عرض هذه التذكرة")).toBeVisible();
    await guest.close();
  });

  test("assistant stays hidden without a Gemini key; the store installs as an app", async ({ page, request }) => {
    expect((await request.get("/assistant")).status()).toBe(404);
    await page.goto("/");
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "مساعد التسوق الذكي" })).toHaveCount(0);
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest).toMatchObject({ dir: "rtl", lang: "ar", display: "standalone" });
    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBe(true);
    await page.goto("/app");
    await noHorizontalOverflow(page);
  });

  test("contact form stores a message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("الاسم").fill("زائر");
    await page.getByLabel("الهاتف").fill("0599123456");
    await page.getByLabel("الرسالة").fill("أريد الاستفسار عن مقاسات البلوزات المتوفرة.");
    await page.getByRole("button", { name: "إرسال" }).click();
    await expect(page.getByText("تم إرسال رسالتك")).toBeVisible();
  });
});
