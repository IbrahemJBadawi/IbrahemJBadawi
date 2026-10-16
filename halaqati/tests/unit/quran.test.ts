import { describe, expect, it } from "vitest";
import { SURAHS, TOTAL_AYAT, formatRange, measureRange } from "@/lib/quran/surahs";

describe("surah reference data", () => {
  it("has 114 surahs totalling 6236 ayat", () => {
    expect(SURAHS).toHaveLength(114);
    expect(SURAHS.reduce((a, s) => a + s.ayahCount, 0)).toBe(TOTAL_AYAT);
    expect(SURAHS[1]).toEqual({ number: 2, name: "البقرة", ayahCount: 286 });
    expect(SURAHS[113]).toEqual({ number: 114, name: "الناس", ayahCount: 6 });
  });
});

describe("measureRange", () => {
  it("counts within one surah", () => {
    expect(measureRange({ surahFrom: 78, ayahFrom: 1, surahTo: 78, ayahTo: 16 })).toEqual({ ok: true, ayahCount: 16 });
  });
  it("counts across surahs", () => {
    expect(measureRange({ surahFrom: 112, ayahFrom: 1, surahTo: 114, ayahTo: 6 })).toEqual({ ok: true, ayahCount: 15 });
    expect(measureRange({ surahFrom: 1, ayahFrom: 1, surahTo: 114, ayahTo: 6 })).toEqual({ ok: true, ayahCount: 6236 });
  });
  it("rejects ayat outside the surah and reversed ranges", () => {
    expect(measureRange({ surahFrom: 1, ayahFrom: 1, surahTo: 1, ayahTo: 8 }).ok).toBe(false);
    expect(measureRange({ surahFrom: 2, ayahFrom: 10, surahTo: 2, ayahTo: 5 }).ok).toBe(false);
    expect(measureRange({ surahFrom: 3, ayahFrom: 1, surahTo: 2, ayahTo: 5 }).ok).toBe(false);
    expect(measureRange({ surahFrom: 115, ayahFrom: 1, surahTo: 115, ayahTo: 1 }).ok).toBe(false);
  });
  it("formats both camelCase and database rows", () => {
    expect(formatRange({ surahFrom: 78, ayahFrom: 1, surahTo: 78, ayahTo: 16 })).toBe("النبأ 1–16");
    expect(formatRange({ surah_from: 112, ayah_from: 1, surah_to: 114, ayah_to: 6 })).toBe("الإخلاص 1 ← الناس 6");
  });
});
