import indexData from "@/data/quran-index.json";

export type SurahType = "meccan" | "medinan" | null;

export interface SurahMeta {
  n: number;
  name: string;
  tr: string;
  type: SurahType;
  ayahs: number;
  page: number;
  endPage: number;
  juz: number;
  order: number;
  /** الرقم التسلسلي لأول آية في المصحف (1..6236) */
  start: number;
}

export interface Ayah {
  a: number;
  t: string;
  /** رقم الصفحة في مصحف المدينة (604 صفحة) */
  p: number;
  j: number;
  sj?: 1;
}

export interface SurahText {
  n: number;
  ayahs: Ayah[];
}

interface QuranIndex {
  source: {
    text: string;
    via: string;
    sha256: string;
    textSha256: string;
    verifiedAgainst: string;
    metadata: string;
    builtAt: string;
  };
  totalAyahs: number;
  totalPages: number;
  surahs: SurahMeta[];
  pageStarts: [number, number][];
  juzStarts: [number, number][];
  hizbQuarterStarts: [number, number][];
  sajdas: [number, number][];
}

export const QURAN = indexData as unknown as QuranIndex;
export const SURAHS: SurahMeta[] = QURAN.surahs;
export const TOTAL_AYAHS = QURAN.totalAyahs;
export const TOTAL_PAGES = QURAN.totalPages;

export function getSurahMeta(n: number): SurahMeta | undefined {
  return Number.isInteger(n) && n >= 1 && n <= 114 ? SURAHS[n - 1] : undefined;
}

export function isValidRef(surah: number, ayah: number): boolean {
  const s = getSurahMeta(surah);
  return !!s && Number.isInteger(ayah) && ayah >= 1 && ayah <= s.ayahs;
}

/** الرقم التسلسلي للآية في المصحف (1..6236). */
export function globalAyahId(surah: number, ayah: number): number {
  const s = getSurahMeta(surah);
  if (!s || ayah < 1 || ayah > s.ayahs) throw new RangeError(`مرجع غير صالح ${surah}:${ayah}`);
  return s.start + ayah - 1;
}

export function fromGlobalAyahId(id: number): { surah: number; ayah: number } {
  if (!Number.isInteger(id) || id < 1 || id > TOTAL_AYAHS) throw new RangeError(`رقم آية غير صالح ${id}`);
  let lo = 0;
  let hi = SURAHS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (SURAHS[mid].start <= id) lo = mid;
    else hi = mid - 1;
  }
  return { surah: SURAHS[lo].n, ayah: id - SURAHS[lo].start + 1 };
}

const PAGE_START_IDS: number[] = QURAN.pageStarts.map(([s, a]) => globalAyahId(s, a));

/** رقم الصفحة (مصحف المدينة) لآية بحسب رقمها التسلسلي. */
export function pageOfGlobalAyah(id: number): number {
  let lo = 0;
  let hi = PAGE_START_IDS.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (PAGE_START_IDS[mid] <= id) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** المدى التسلسلي لآيات صفحة معينة [أول، آخر]. */
export function pageRange(page: number): [number, number] {
  if (page < 1 || page > TOTAL_PAGES) throw new RangeError(`صفحة غير صالحة ${page}`);
  const first = PAGE_START_IDS[page - 1];
  const last = page === TOTAL_PAGES ? TOTAL_AYAHS : PAGE_START_IDS[page] - 1;
  return [first, last];
}

export function juzStartRef(juz: number): { surah: number; ayah: number } {
  const [surah, ayah] = QURAN.juzStarts[juz - 1];
  return { surah, ayah };
}

export function surahTypeLabel(type: SurahType): string | null {
  if (type === "meccan") return "مكية";
  if (type === "medinan") return "مدنية";
  return null;
}

/** صيغة النسبة المعتمدة للآية: ﴿...﴾ [البقرة: 255] */
export function formatCitation(surah: number, from: number, to = from): string {
  const s = getSurahMeta(surah);
  const range = from === to ? toArabicDigits(from) : `${toArabicDigits(from)}–${toArabicDigits(to)}`;
  return `[${s?.name ?? ""}: ${range}]`;
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export function toArabicDigits(n: number | string): string {
  return String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
}

export function fromArabicDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

/** تطبيع عربي للبحث: حذف التشكيل وتوحيد صور الهمزة والتاء المربوطة والألف المقصورة. */
export function normalizeArabic(s: string): string {
  return fromArabicDigits(s)
    .normalize("NFKD")
    .replace(/[ً-ٰٟۖ-ࣰۭ-ࣲـ]/g, "")
    .replace(/[إأآٱا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/^ال/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const NORMALIZED_NAMES = SURAHS.map((s) => ({
  n: s.n,
  ar: normalizeArabic(s.name),
  tr: s.tr.toLowerCase().replace(/[^a-z]/g, ""),
}));

export function searchSurahs(query: string): SurahMeta[] {
  const q = normalizeArabic(query);
  if (!q) return SURAHS;
  const qLatin = q.replace(/[^a-z]/g, "");
  if (/^\d+$/.test(q)) {
    const n = Number(q);
    return SURAHS.filter((s) => s.n === n || String(s.n).startsWith(q));
  }
  return NORMALIZED_NAMES.filter(
    (s) => s.ar.includes(q.replace(/^ال/, "")) || (qLatin.length > 1 && s.tr.includes(qLatin)),
  ).map((s) => SURAHS[s.n - 1]);
}

/**
 * يحوّل نصًا مثل "2:255" أو "البقرة 255" أو "٢ ٢٥٥" إلى مرجع آية صالح.
 */
export function parseAyahRef(input: string): { surah: number; ayah: number } | null {
  const q = fromArabicDigits(input).trim();
  const numeric = q.match(/^(\d{1,3})\s*[:：\-\s/]\s*(\d{1,3})$/);
  if (numeric) {
    const surah = Number(numeric[1]);
    const ayah = Number(numeric[2]);
    return isValidRef(surah, ayah) ? { surah, ayah } : null;
  }
  const named = q.match(/^(.+?)\s*[:：\s]\s*(\d{1,3})$/);
  if (named) {
    const matches = searchSurahs(named[1]);
    const ayah = Number(named[2]);
    if (matches.length >= 1 && isValidRef(matches[0].n, ayah)) return { surah: matches[0].n, ayah };
  }
  return null;
}
