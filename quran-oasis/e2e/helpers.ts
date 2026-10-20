import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("404")) errors.push(m.text());
  });
  return {
    errors,
    expectClean: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

export async function state(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("qo:state:v1") ?? "null"));
}

/** نص الآية حرفيًا من ملف البيانات المعتمد (للمقارنة الدقيقة). */
export function ayahText(surah: number, ayah: number): string {
  const d = JSON.parse(readFileSync(path.join(import.meta.dirname, "../public/data/quran", `${surah}.json`), "utf8"));
  return d.ayahs[ayah - 1].t;
}
