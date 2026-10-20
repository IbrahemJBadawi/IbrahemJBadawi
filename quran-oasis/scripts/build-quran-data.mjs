#!/usr/bin/env node
/**
 * يبني بيانات القرآن الكريم الثابتة للمنصة من مصادر موثوقة، ويتحقق منها قبل الكتابة.
 *
 * المصدر الأساسي للنص:
 *   نص مصحف المدينة النبوية برواية حفص عن عاصم — مجمع الملك فهد لطباعة المصحف الشريف
 *   (Uthmanic Hafs, Version 13) كما ينشره مستودع fawazahmed0/quran-api
 *   (edition: ara-quranuthmanihaf). يُستخدم النص حرفيًا دون أي تعديل.
 *
 * مصدر التحقق المستقل:
 *   نص موسوعة القرآن الكريم QuranEnc كما تنشره حزمة quran-json (CC BY 4.0).
 *   يُقارَن "الهيكل الحرفي" لكل آية (الحروف دون علامات الضبط) بين المصدرين، ويجب أن يتطابق 100%.
 *
 * البيانات الوصفية (الصفحات وفق مصحف المدينة 604 صفحة، الأجزاء، الأحزاب، السجدات):
 *   حزمة quran-meta (MIT) لرواية حفص.
 *
 * الاستخدام:  node scripts/build-quran-data.mjs [--source <path-to-local-json>]
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_URL =
  "https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/ara-quranuthmanihaf.json";
// بصمة الملف المصدر الذي تمت مراجعته. أي تغيير في المصدر يوقف البناء حتى تتم مراجعته يدويًا.
const SOURCE_SHA256 = "1102ef9e0bab89a28c90b513b5281687948dddc905dcef2e1af9206bb151b91f";

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function loadPrimary() {
  const i = process.argv.indexOf("--source");
  let raw;
  if (i > -1) {
    raw = await readFile(process.argv[i + 1]);
  } else {
    const res = await fetch(SOURCE_URL);
    if (!res.ok) fail(`تعذر تحميل المصدر (${res.status})`);
    raw = Buffer.from(await res.arrayBuffer());
  }
  const sha = createHash("sha256").update(raw).digest("hex");
  if (sha !== SOURCE_SHA256) {
    fail(`بصمة المصدر تغيّرت (${sha}). راجع التغييرات يدويًا قبل تحديث SOURCE_SHA256.`);
  }
  return JSON.parse(raw.toString("utf8")).quran;
}

/** الهيكل الحرفي: تفكيك Unicode ثم حذف علامات الضبط والمحارف غير المرئية والتطويل والمسافات. */
function skeleton(text) {
  return [...text.normalize("NFD")]
    .filter((c) => !/\p{Mn}|\p{Cf}|\p{Zs}/u.test(c) && c !== "ـ" && c !== " ")
    .join("");
}

const primary = await loadPrimary();
const verifier = require("quran-json/dist/quran.json");
const meta = await import("quran-meta/hafs");

if (primary.length !== 6236) fail(`عدد الآيات في المصدر ${primary.length} بدل 6236`);
if (verifier.length !== 114) fail("مصدر التحقق لا يحتوي 114 سورة");

const verifierAyahs = verifier.flatMap((s) => s.verses.map((v) => ({ s: s.id, a: v.id, t: v.text })));
let idx = 0;
const surahs = [];
const pageStarts = []; // pageStarts[page-1] = [surah, ayah]
const juzStarts = [];
const hizbQuarterStarts = [];
const sajdas = [];
let mismatches = 0;

await mkdir(path.join(ROOT, "public/data/quran"), { recursive: true });
await mkdir(path.join(ROOT, "src/data"), { recursive: true });

for (let s = 1; s <= 114; s++) {
  const m = meta.getSurahMeta(s);
  const v = verifier[s - 1];
  if (v.total_verses !== m.ayahCount) fail(`عدد آيات السورة ${s} مختلف بين المصادر`);
  const ayahs = [];
  for (let a = 1; a <= m.ayahCount; a++, idx++) {
    const p = primary[idx];
    if (p.chapter !== s || p.verse !== a) fail(`ترتيب غير متوقع عند ${s}:${a}`);
    const check = verifierAyahs[idx];
    if (check.s !== s || check.a !== a || skeleton(check.t) !== skeleton(p.text)) {
      mismatches++;
      console.error(`✗ عدم تطابق حرفي عند ${s}:${a}`);
    }
    const am = meta.getAyahMeta(m.firstAyahId + a - 1);
    if (am.surah !== s || am.ayah !== a) fail(`بيانات وصفية غير متطابقة عند ${s}:${a}`);
    if (am.isStartOfPage) pageStarts[am.page - 1] = [s, a];
    if (am.isStartOfJuz) juzStarts[am.juz - 1] = [s, a];
    if (am.isStartOfQuarter) hizbQuarterStarts[am.rubAlHizbId - 1] = [s, a];
    if (am.isSajdahAyah) sajdas.push([s, a]);
    const ayah = { a, t: p.text, p: am.page, j: am.juz };
    if (am.isSajdahAyah) ayah.sj = 1;
    ayahs.push(ayah);
  }
  // التصنيف المكي/المدني يُعرض فقط عند اتفاق المصدرين.
  const typeA = m.isMeccan ? "meccan" : "medinan";
  const type = typeA === v.type ? typeA : null;
  if (!type) console.warn(`! اختلاف التصنيف للسورة ${s}؛ لن يُعرض.`);
  surahs.push({
    n: s,
    name: v.name,
    tr: v.transliteration,
    type,
    ayahs: m.ayahCount,
    page: ayahs[0].p,
    endPage: ayahs[ayahs.length - 1].p,
    juz: ayahs[0].j,
    order: m.surahOrder,
    start: m.firstAyahId, // الرقم التسلسلي لأول آية في المصحف (1..6236)
  });
  await writeFile(
    path.join(ROOT, `public/data/quran/${s}.json`),
    JSON.stringify({ n: s, ayahs }),
  );
}

if (mismatches) fail(`${mismatches} آية غير متطابقة مع مصدر التحقق`);
if (pageStarts.filter(Boolean).length !== 604) fail("بيانات الصفحات غير مكتملة");
if (juzStarts.filter(Boolean).length !== 30) fail("بيانات الأجزاء غير مكتملة");
if (sajdas.length !== 15) fail("عدد السجدات غير صحيح");

const fullText = primary.map((p) => p.text).join("\n");
const index = {
  source: {
    text: "مصحف المدينة النبوية — رواية حفص عن عاصم — مجمع الملك فهد لطباعة المصحف الشريف (الإصدار 13)",
    via: SOURCE_URL,
    sha256: SOURCE_SHA256,
    textSha256: createHash("sha256").update(fullText).digest("hex"),
    verifiedAgainst: "QuranEnc (quran-json@3.1.2)",
    metadata: "quran-meta@7.0.0 (Hafs, 604-page Madinah mushaf)",
    builtAt: new Date().toISOString().slice(0, 10),
  },
  totalAyahs: 6236,
  totalPages: 604,
  surahs,
  pageStarts,
  juzStarts,
  hizbQuarterStarts,
  sajdas,
};
await writeFile(path.join(ROOT, "src/data/quran-index.json"), JSON.stringify(index, null, 1));
console.log(`✓ 114 سورة، 6236 آية، تطابق حرفي كامل مع مصدر التحقق. textSha256=${index.source.textSha256}`);
