import { expect, test } from "@playwright/test";
import { state, trackErrors } from "./helpers";

test("الخلوة: حفظ الخطوات والخاطرة والخِتام بعد إعادة الفتح", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/khalwa");
  await expect(page.getByRole("heading", { name: /خلوة مع الله/ })).toBeVisible();
  await page.getByRole("button", { name: "10 دقيقة" }).click();
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: "أنجزتُ هذه الخطوة" }).click();
  await page.getByPlaceholder("ما الخطوة الصغيرة التي أريد الاستمرار عليها؟").fill("أخصص وقتًا ثابتًا للورد");
  await page.getByRole("button", { name: "ختام الخلوة" }).click();
  await expect(page.getByRole("button", { name: /خلوة اليوم مكتملة/ })).toBeDisabled();
  await page.reload();
  await expect(page.getByPlaceholder("ما الخطوة الصغيرة التي أريد الاستمرار عليها؟")).toHaveValue("أخصص وقتًا ثابتًا للورد");
  expect(Object.values((await state(page)).khalwa)[0]).toMatchObject({ minutes: 10, finishedAt: expect.any(String) });
  errors.expectClean();
});

test("خليلي: إنشاء تحدٍ، تسجيل اليوم، توليد دعوة وتقرير للتبادل", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/khalili");
  await expect(page.getByRole("heading", { name: /خليلي/ })).toBeVisible();
  await page.getByRole("textbox", { name: "اسمك" }).fill("إبراهيم");
  await page.getByRole("textbox", { name: "اسم الخليل" }).fill("أحمد");
  await page.getByRole("button", { name: "أنشئ التحدّي" }).click();
  const invite = page.getByRole("textbox", { name: "رابط دعوة خليلك" });
  await expect(invite).toHaveValue(/invite=/);
  await page.getByRole("button", { name: "سجّل إنجازك" }).first().click();
  await page.getByRole("button", { name: "مشاركة تقدمي" }).click();
  await expect(page.getByRole("textbox", { name: "رابط تحديث تقدمك" })).toHaveValue(/report=/);
  const saved = Object.values((await state(page)).challenges);
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({ myName: "إبراهيم", partnerName: "أحمد" });
  errors.expectClean();
});
