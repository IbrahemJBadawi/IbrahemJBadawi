import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSurahMeta, type SurahText } from "./index";

/** قراءة نص السورة على الخادم وقت البناء (للتوليد الثابت وتحسين محركات البحث). */
export async function readSurahText(n: number): Promise<SurahText | null> {
  if (!getSurahMeta(n)) return null;
  const file = path.join(process.cwd(), "public", "data", "quran", `${n}.json`);
  return JSON.parse(await readFile(file, "utf8")) as SurahText;
}
