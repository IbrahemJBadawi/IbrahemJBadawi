import { expect, test } from "@playwright/test";

const PAGES = ["/", "/about", "/services", "/services/ai-automation", "/ventures", "/ventures/halaqati", "/solutions", "/contact", "/app", "/privacy", "/terms"];

test.describe("pages", () => {
  for (const path of PAGES) {
    test(`Arabic and English ${path}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.locator("h1").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

      await page.goto(path === "/" ? "/en" : `/en${path}`);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      expect(errors).toEqual([]);
    });
  }

  test("unknown pages return a localized 404", async ({ page }) => {
    const response = await page.goto("/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "الصفحة غير موجودة" })).toBeVisible();
    const en = await page.goto("/en/ventures/nope");
    expect(en?.status()).toBe(404);
  });

  test("every internal link resolves", async ({ page, request }) => {
    const seen = new Set<string>();
    for (const start of ["/", "/en"]) {
      await page.goto(start);
      const links = await page.locator("a[href^='/']").evaluateAll((anchors) => anchors.map((a) => a.getAttribute("href")!));
      for (const link of links) seen.add(link.split("#")[0]);
    }
    for (const link of seen) {
      const response = await request.get(link, { maxRedirects: 5 });
      expect(response.status(), link).toBeLessThan(400);
    }
  });
});

test.describe("language", () => {
  test("switching to English is remembered, and back to Arabic", async ({ page, isMobile }) => {
    await page.goto("/about");
    if (isMobile) {
      await page.getByRole("link", { name: "Switch to English" }).first().click();
    } else {
      await page.locator(".header-actions").getByRole("link", { name: "Switch to English" }).click();
    }
    await expect(page).toHaveURL(/\/en\/about$/);
    await page.goto("/services");
    await expect(page).toHaveURL(/\/en\/services$/);
    await page.locator(".header-actions").getByRole("link", { name: "التبديل إلى العربية" }).click();
    await expect(page).toHaveURL(/\/about$|\/services$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("the language switch cannot redirect off-site", async ({ request }) => {
    const response = await request.get("/lang/en?next=//evil.example", { maxRedirects: 0 });
    expect(response.headers().location).toMatch(/^\/en$|\/en$/);
  });
});

test.describe("contact form", () => {
  test("validates in the browser before sending", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "أرسل الطلب" }).click();
    await expect(page.getByText("اختر نوع الطلب.")).toBeVisible();
    await expect(page.getByText("يلزم الموافقة على سياسة الخصوصية")).toBeVisible();
  });

  test("never claims success when sending isn't configured, and keeps the draft", async ({ page }) => {
    await page.goto("/en/contact?type=service&topic=ai-automation");
    await expect(page.getByText("Regarding:")).toBeVisible();
    await page.getByLabel("Name").fill("Test Person");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Describe your project or request").fill("We would like to automate our customer replies.");
    await page.getByRole("checkbox").check();
    await page.waitForTimeout(3100); // the server ignores forms sent faster than a person can type
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Not sent: sending directly from the website isn't set up yet.")).toBeVisible();
    await expect(page.getByText("Your request was received")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open email with your message" })).toHaveAttribute("href", /^mailto:/);

    await page.reload();
    await expect(page.getByLabel("Name")).toHaveValue("Test Person");
    await expect(page.getByText("We restored your unsent draft")).toBeVisible();
  });
});

test.describe("on this device", () => {
  test("following a venture persists and filters", async ({ page }) => {
    await page.goto("/en/ventures");
    await page.getByRole("button", { name: "Follow Halaqati" }).click();
    await expect(page.getByRole("button", { name: "Unfollow Halaqati" })).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: /^Following/ }).first().click();
    await expect(page.locator(".venture-card")).toHaveCount(1);
    await expect(page.locator(".venture-card h3")).toHaveText("Halaqati");
  });

  test("dark mode is remembered across pages", async ({ page }) => {
    await page.goto("/en/app");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.goto("/en/about");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("updates bell shows new items and marks them read", async ({ page }) => {
    await page.goto("/en");
    const bell = page.getByRole("button", { name: /Updates, \d+ new/ });
    await expect(bell).toBeVisible();
    await bell.click();
    await page.getByRole("button", { name: "Mark all as read" }).click();
    await expect(page.getByRole("button", { name: "Updates", exact: true })).toBeVisible();
  });

  test("clearing local data resets preferences", async ({ page }) => {
    await page.goto("/en/app");
    await page.getByRole("button", { name: "Dark", exact: true }).click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Clear local data" }).click();
    await expect(page.getByText("Local data cleared.")).toBeVisible();
    expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tm-")).length)).toBe(0);
  });
});

test.describe("SEO", () => {
  test("pages have unique titles and hreflang", async ({ page }) => {
    const titles = new Set<string>();
    for (const path of ["/", "/about", "/services", "/ventures", "/contact", "/en/about"]) {
      await page.goto(path);
      titles.add(await page.title());
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(1);
    }
    expect(titles.size).toBe(6);
  });

  test("sitemap, robots and manifest are served", async ({ request }) => {
    expect((await request.get("/sitemap.xml")).status()).toBe(200);
    expect((await request.get("/robots.txt")).status()).toBe(200);
    const manifest = await (await request.get("/manifest.webmanifest")).json();
    expect(manifest.short_name).toBe("TechMood");
  });
});
