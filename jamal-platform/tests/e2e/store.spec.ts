import { execFileSync } from "node:child_process";
import { expect, test, type Page } from "@playwright/test";

const stamp = Date.now();
const customerEmail = `customer.${stamp}@example.com`;
const adminEmail = `admin.${stamp}@example.com`;
const password = "Test-password-123";
const phone = `+96279${String(stamp).slice(-7)}`;

async function register(page: Page, name: string, email: string) {
  await page.goto("/register");
  await page.getByLabel("الاسم الكامل").fill(name);
  await page.getByLabel("البريد الإلكتروني").fill(email);
  await page.getByLabel("كلمة المرور").fill(password);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "إنشاء الحساب" }).click();
  await expect(page).toHaveURL(/\/account$/);
}

async function addDressToCart(page: Page) {
  await page.goto("/products");
  await page.getByRole("link", { name: /فستان ميدي من الكتان/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "فستان ميدي من الكتان" })).toBeVisible();
  // Must pick colour and size first.
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("يرجى اختيار اللون.")).toBeVisible();
  await page.getByRole("button", { name: "بيج" }).click();
  await page.getByRole("button", { name: "M", exact: true }).click();
  await page.getByRole("button", { name: "أضف إلى السلة" }).click();
  await expect(page.getByText("تمت الإضافة إلى السلة")).toBeVisible();
}

test.describe.serial("Jamal storefront & admin", () => {
  let orderNumber = "";

  test("renders Arabic RTL and the catalog on mobile", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { name: /أناقة هادئة/ })).toBeVisible();
    // No horizontal overflow on a phone.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByRole("button", { name: "فتح القائمة" }).click();
    await page.getByRole("dialog").getByRole("link", { name: "الأحذية" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "الأحذية" })).toBeVisible();
  });

  test("search and filters work", async ({ page }) => {
    await page.goto("/search?q=" + encodeURIComponent("حقيبه")); // ه vs ة normalisation
    await expect(page.getByText(/حقيبة توت مُهيكلة|حقيبة كروس صغيرة/).first()).toBeVisible();
    await page.goto("/products?sale=1&sort=price_asc");
    await expect(page.getByText("تخفيض").first()).toBeVisible();
  });

  test("guest can order with server-computed totals", async ({ page }) => {
    await addDressToCart(page);
    await page.goto("/cart");
    await expect(page.getByText("فستان ميدي من الكتان")).toBeVisible();
    await page.getByRole("button", { name: "زيادة الكمية" }).first().click();
    await expect(page.getByText("‎$92.00").or(page.getByText("$92.00")).first()).toBeVisible();
    await page.getByRole("link", { name: "إتمام الطلب" }).click();

    await page.getByLabel("الاسم الكامل").fill("عميل تجريبي");
    await page.getByLabel("رقم الهاتف").fill(phone);
    await page.getByLabel("الدولة").selectOption("JO");
    await page.getByLabel("المدينة").fill("عمّان");
    await page.getByLabel("العنوان التفصيلي").fill("شارع الجامعة، بناية 10");
    // 2 × 46 = 92 ≥ 100? No → shipping 5 → total 97 (JO demo zone).
    await expect(page.getByText("$97.00").first()).toBeVisible();
    await expect(page.getByText("الدفع عند الاستلام", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "تأكيد الطلب" }).click();
    await expect(page.getByText("يجب الموافقة على الشروط والسياسات")).toBeVisible();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "تأكيد الطلب" }).click();

    await expect(page.getByRole("heading", { name: /تم استلام طلبك/ })).toBeVisible();
    await expect(page.getByText("هذا طلب اختبار")).toBeVisible();
    orderNumber = (await page.locator("p.font-mono").first().innerText()).trim();
    expect(orderNumber).toMatch(/^JM\d{6}-[A-Z0-9]{6}$/);
    // Cart is emptied after ordering.
    await page.goto("/cart");
    await expect(page.getByText("سلتك فارغة")).toBeVisible();
  });

  test("guest can track the order by number + phone only", async ({ page }) => {
    await page.goto(`/track?n=${orderNumber}&p=${encodeURIComponent("+962700000001")}`);
    await expect(page.getByText("لم نجد طلبًا")).toBeVisible();
    await page.goto(`/track?n=${orderNumber}&p=${encodeURIComponent(phone)}`);
    await expect(page.getByText("قيد المراجعة").first()).toBeVisible();
  });

  test("customer account, favorites, and admin is hidden from customers", async ({ page }) => {
    await page.goto("/favorites");
    await expect(page).toHaveURL(/\/login\?next=%2Ffavorites/);
    await register(page, "سارة", customerEmail);
    await page.goto("/product/demo-silk-scarf");
    await page.getByRole("button", { name: "إضافة إلى المفضلة" }).click();
    await expect(page.getByRole("button", { name: "إزالة من المفضلة" })).toBeVisible();
    await page.goto("/favorites");
    await expect(page.getByText("وشاح بملمس حريري")).toBeVisible();
    // Non-admins get the not-found UI and no admin content (checked server-side + RLS).
    await page.goto("/admin");
    await expect(page.getByText(/غير موجود/).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "الملخص" })).toHaveCount(0);
    await expect(page.getByText("الطلبات", { exact: true })).toHaveCount(0);
  });

  test("admin manages the order and the customer sees tracking", async ({ page }) => {
    await register(page, "مدير المتجر", adminEmail);
    execFileSync("npx", ["tsx", "scripts/grant-admin.ts", adminEmail], { env: process.env, stdio: "pipe" });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "الملخص" })).toBeVisible();

    await page.goto(`/admin/orders?tests=1&q=${orderNumber}`);
    await page.getByRole("link", { name: orderNumber }).click();
    await expect(page.getByText("نسخ تفاصيل الطلب للمورد")).toBeVisible();
    await expect(page.getByText(/الربح المتوقع/)).toBeVisible();

    await page.getByLabel("الحالة الجديدة").selectOption("confirmed");
    await page.getByRole("button", { name: "تحديث الحالة" }).click();
    await expect(page.getByText("تم تحديث حالة الطلب.")).toBeVisible();

    await page.getByLabel("حالة التنفيذ").selectOption("shipped");
    await page.getByLabel("شركة الشحن").fill("Aramex");
    await page.getByLabel("رقم التتبع").fill("TRACK123456");
    await page.getByLabel("التكلفة الفعلية للمنتجات").fill("44");
    await page.getByRole("button", { name: "حفظ سجل التنفيذ" }).click();
    await expect(page.getByText("تم حفظ سجل التنفيذ.")).toBeVisible();

    await page.goto("/admin/audit");
    await expect(page.getByText("fulfillment_update").first()).toBeVisible();

    await page.goto(`/track?n=${orderNumber}&p=${encodeURIComponent(phone)}`);
    await expect(page.getByText("TRACK123456")).toBeVisible();
    await expect(page.getByText("مؤكد").first()).toBeVisible();
  });

  test("contact form stores a message", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel("الاسم").fill("زائر");
    await page.getByLabel("البريد الإلكتروني").fill("visitor@example.com");
    await page.getByLabel("الرسالة").fill("أريد الاستفسار عن مقاسات الأحذية المتوفرة.");
    await page.getByRole("button", { name: "إرسال" }).click();
    await expect(page.getByText("تم إرسال رسالتك")).toBeVisible();
  });
});
