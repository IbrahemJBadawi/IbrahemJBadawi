/**
 * Canonical list of the 114 surahs (Hafs ʿan ʿĀṣim numbering).
 * Mirrors the `public.quran_surahs` reference table; a unit test checks
 * that the totals match (6236 ayat) and a DB test checks both agree.
 */
export type Surah = { number: number; name: string; ayahCount: number };

const DATA: Array<[string, number]> = [
  ["الفاتحة", 7], ["البقرة", 286], ["آل عمران", 200], ["النساء", 176], ["المائدة", 120],
  ["الأنعام", 165], ["الأعراف", 206], ["الأنفال", 75], ["التوبة", 129], ["يونس", 109],
  ["هود", 123], ["يوسف", 111], ["الرعد", 43], ["إبراهيم", 52], ["الحجر", 99],
  ["النحل", 128], ["الإسراء", 111], ["الكهف", 110], ["مريم", 98], ["طه", 135],
  ["الأنبياء", 112], ["الحج", 78], ["المؤمنون", 118], ["النور", 64], ["الفرقان", 77],
  ["الشعراء", 227], ["النمل", 93], ["القصص", 88], ["العنكبوت", 69], ["الروم", 60],
  ["لقمان", 34], ["السجدة", 30], ["الأحزاب", 73], ["سبأ", 54], ["فاطر", 45],
  ["يس", 83], ["الصافات", 182], ["ص", 88], ["الزمر", 75], ["غافر", 85],
  ["فصلت", 54], ["الشورى", 53], ["الزخرف", 89], ["الدخان", 59], ["الجاثية", 37],
  ["الأحقاف", 35], ["محمد", 38], ["الفتح", 29], ["الحجرات", 18], ["ق", 45],
  ["الذاريات", 60], ["الطور", 49], ["النجم", 62], ["القمر", 55], ["الرحمن", 78],
  ["الواقعة", 96], ["الحديد", 29], ["المجادلة", 22], ["الحشر", 24], ["الممتحنة", 13],
  ["الصف", 14], ["الجمعة", 11], ["المنافقون", 11], ["التغابن", 18], ["الطلاق", 12],
  ["التحريم", 12], ["الملك", 30], ["القلم", 52], ["الحاقة", 52], ["المعارج", 44],
  ["نوح", 28], ["الجن", 28], ["المزمل", 20], ["المدثر", 56], ["القيامة", 40],
  ["الإنسان", 31], ["المرسلات", 50], ["النبأ", 40], ["النازعات", 46], ["عبس", 42],
  ["التكوير", 29], ["الانفطار", 19], ["المطففين", 36], ["الانشقاق", 25], ["البروج", 22],
  ["الطارق", 17], ["الأعلى", 19], ["الغاشية", 26], ["الفجر", 30], ["البلد", 20],
  ["الشمس", 15], ["الليل", 21], ["الضحى", 11], ["الشرح", 8], ["التين", 8],
  ["العلق", 19], ["القدر", 5], ["البينة", 8], ["الزلزلة", 8], ["العاديات", 11],
  ["القارعة", 11], ["التكاثر", 8], ["العصر", 3], ["الهمزة", 9], ["الفيل", 5],
  ["قريش", 4], ["الماعون", 7], ["الكوثر", 3], ["الكافرون", 6], ["النصر", 3],
  ["المسد", 5], ["الإخلاص", 4], ["الفلق", 5], ["الناس", 6],
];

export const SURAHS: readonly Surah[] = DATA.map(([name, ayahCount], i) => ({
  number: i + 1,
  name,
  ayahCount,
}));

export const TOTAL_AYAT = 6236;

export function getSurah(number: number): Surah | undefined {
  return SURAHS[number - 1];
}

export type QuranRange = {
  surahFrom: number;
  ayahFrom: number;
  surahTo: number;
  ayahTo: number;
};

/** Validates a range in mushaf order and returns its ayah count, or an Arabic error. */
export function measureRange(r: QuranRange): { ok: true; ayahCount: number } | { ok: false; error: string } {
  const from = getSurah(r.surahFrom);
  const to = getSurah(r.surahTo);
  if (!from || !to) return { ok: false, error: "رقم السورة غير صحيح" };
  if (r.ayahFrom < 1 || r.ayahFrom > from.ayahCount) {
    return { ok: false, error: `سورة ${from.name} عدد آياتها ${from.ayahCount}` };
  }
  if (r.ayahTo < 1 || r.ayahTo > to.ayahCount) {
    return { ok: false, error: `سورة ${to.name} عدد آياتها ${to.ayahCount}` };
  }
  if (r.surahTo < r.surahFrom || (r.surahTo === r.surahFrom && r.ayahTo < r.ayahFrom)) {
    return { ok: false, error: "يجب أن تكون نهاية المقطع بعد بدايته في ترتيب المصحف" };
  }
  if (r.surahFrom === r.surahTo) return { ok: true, ayahCount: r.ayahTo - r.ayahFrom + 1 };
  let count = from.ayahCount - r.ayahFrom + 1;
  for (let s = r.surahFrom + 1; s < r.surahTo; s++) count += SURAHS[s - 1].ayahCount;
  count += r.ayahTo;
  return { ok: true, ayahCount: count };
}

/** Range as stored in the database (snake_case columns). */
export type DbRange = { surah_from: number; ayah_from: number; surah_to: number; ayah_to: number };

function normalize(r: QuranRange | DbRange): QuranRange {
  return "surah_from" in r
    ? { surahFrom: r.surah_from, ayahFrom: r.ayah_from, surahTo: r.surah_to, ayahTo: r.ayah_to }
    : r;
}

export function formatRange(range: QuranRange | DbRange): string {
  const r = normalize(range);
  const from = getSurah(r.surahFrom)?.name ?? "؟";
  const to = getSurah(r.surahTo)?.name ?? "؟";
  if (r.surahFrom === r.surahTo) return `${from} ${r.ayahFrom}–${r.ayahTo}`;
  return `${from} ${r.ayahFrom} ← ${to} ${r.ayahTo}`;
}
