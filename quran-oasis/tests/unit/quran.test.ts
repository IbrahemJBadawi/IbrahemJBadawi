import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatCitation,
  fromGlobalAyahId,
  getSurahMeta,
  globalAyahId,
  normalizeArabic,
  pageOfGlobalAyah,
  pageRange,
  parseAyahRef,
  QURAN,
  searchSurahs,
  SURAHS,
  TOTAL_AYAHS,
} from "@/lib/quran";

const load = (n: number) => JSON.parse(readFileSync(path.join(__dirname, "../../public/data/quran", `${n}.json`), "utf8"));

describe("بيانات القرآن", () => {
  it("114 سورة و6236 آية بترتيب صحيح، والبصمة تطابق المسجلة", () => {
    expect(SURAHS).toHaveLength(114);
    const texts: string[] = [];
    for (const s of SURAHS) {
      const d = load(s.n);
      expect(d.ayahs).toHaveLength(s.ayahs);
      d.ayahs.forEach((a: { a: number; t: string }, i: number) => {
        expect(a.a).toBe(i + 1);
        texts.push(a.t);
      });
    }
    expect(texts).toHaveLength(6236);
    expect(createHash("sha256").update(texts.join("\n")).digest("hex")).toBe(QURAN.source.textSha256);
  });

  it("أعداد آيات معروفة", () => {
    expect(getSurahMeta(1)?.ayahs).toBe(7);
    expect(getSurahMeta(2)?.ayahs).toBe(286);
    expect(getSurahMeta(9)?.ayahs).toBe(129);
    expect(getSurahMeta(114)?.ayahs).toBe(6);
    expect(getSurahMeta(115)).toBeUndefined();
  });

  it("الصفحات وفق مصحف المدينة", () => {
    expect(pageOfGlobalAyah(globalAyahId(1, 1))).toBe(1);
    expect(pageOfGlobalAyah(globalAyahId(2, 1))).toBe(2);
    expect(pageOfGlobalAyah(globalAyahId(2, 255))).toBe(42);
    expect(pageOfGlobalAyah(globalAyahId(114, 6))).toBe(604);
    expect(pageRange(1)).toEqual([1, 7]);
    expect(pageRange(604)[1]).toBe(TOTAL_AYAHS);
  });

  it("التحويل بين المرجع والرقم التسلسلي", () => {
    expect(globalAyahId(2, 1)).toBe(8);
    expect(fromGlobalAyahId(262)).toEqual({ surah: 2, ayah: 255 });
    expect(fromGlobalAyahId(6236)).toEqual({ surah: 114, ayah: 6 });
    expect(() => globalAyahId(1, 8)).toThrow();
  });

  it("البحث والانتقال إلى آية", () => {
    expect(searchSurahs("البقرة")[0].n).toBe(2);
    expect(searchSurahs("بقره")[0].n).toBe(2);
    expect(searchSurahs("yasin").some((s) => s.n === 36)).toBe(true);
    expect(searchSurahs("٣٦")[0].n).toBe(36);
    expect(parseAyahRef("2:255")).toEqual({ surah: 2, ayah: 255 });
    expect(parseAyahRef("٢:٢٥٥")).toEqual({ surah: 2, ayah: 255 });
    expect(parseAyahRef("البقرة 255")).toEqual({ surah: 2, ayah: 255 });
    expect(parseAyahRef("1:8")).toBeNull();
    expect(normalizeArabic("ٱلْإِخْلَاص")).toBe(normalizeArabic("الاخلاص"));
  });

  it("صيغة النسبة", () => {
    expect(formatCitation(2, 255)).toBe("[البقرة: ٢٥٥]");
    expect(formatCitation(2, 285, 286)).toBe("[البقرة: ٢٨٥–٢٨٦]");
  });
});
