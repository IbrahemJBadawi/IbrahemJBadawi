#!/usr/bin/env node
/** تحقق دون اتصال من سلامة بيانات القرآن المولّدة: العدد والترتيب والبصمة. */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(await readFile(path.join(ROOT, "src/data/quran-index.json"), "utf8"));
const texts = [];
let errors = 0;
for (const s of index.surahs) {
  const data = JSON.parse(await readFile(path.join(ROOT, `public/data/quran/${s.n}.json`), "utf8"));
  if (data.n !== s.n || data.ayahs.length !== s.ayahs) {
    console.error(`✗ السورة ${s.n}: عدد الآيات غير صحيح`);
    errors++;
  }
  data.ayahs.forEach((a, i) => {
    if (a.a !== i + 1 || !a.t) {
      console.error(`✗ ترتيب غير صحيح في ${s.n}:${i + 1}`);
      errors++;
    }
    texts.push(a.t);
  });
}
const sha = createHash("sha256").update(texts.join("\n")).digest("hex");
if (texts.length !== 6236) errors++, console.error(`✗ مجموع الآيات ${texts.length}`);
if (sha !== index.source.textSha256) errors++, console.error("✗ بصمة النص لا تطابق البصمة المسجلة");
if (errors) process.exit(1);
console.log(`✓ البيانات سليمة: 114 سورة، 6236 آية، البصمة ${sha.slice(0, 16)}…`);
