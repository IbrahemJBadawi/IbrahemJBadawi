import { describe, expect, it } from "vitest";
import { ADHKAR, DHIKR_CATEGORIES } from "@/content/adhkar";
import { LEARNING_PATHS } from "@/content/learning";
import MOMENTS from "@/content/oasis-moments.json";
import { isValidRef } from "@/lib/quran";

const QURAN_RANGE = /[ٱࣰۡ-ࣲ]/; // حروف خاصة بالرسم العثماني لا تظهر في نصوص الأحاديث

describe("المحتوى الافتتاحي", () => {
  it("كل ذكر له قسم صحيح ومصدر وعدد تكرار، والمراجع القرآنية صالحة", () => {
    const ids = new Set<string>();
    const cats = new Set(DHIKR_CATEGORIES.map((c) => c.id));
    for (const d of ADHKAR) {
      expect(ids.has(d.id), d.id).toBe(false);
      ids.add(d.id);
      expect(cats.has(d.category)).toBe(true);
      expect(d.source.length).toBeGreaterThan(3);
      expect(d.repeat).toBeGreaterThanOrEqual(1);
      expect(d.text || d.quran?.length).toBeTruthy();
      for (const r of d.quran ?? []) {
        expect(isValidRef(r.surah, r.from) && isValidRef(r.surah, r.to)).toBe(true);
      }
    }
  });

  it("لا يُكتب نص قرآني بالرسم العثماني يدويًا داخل الأذكار أو الدروس", () => {
    for (const d of ADHKAR) {
      expect(QURAN_RANGE.test(`${d.text ?? ""}${d.note ?? ""}${d.virtue ?? ""}`), d.id).toBe(false);
    }
    for (const p of LEARNING_PATHS) for (const l of p.lessons) expect(QURAN_RANGE.test(l.body), l.id).toBe(false);
  });

  it("لحظات واحة: مراجع صالحة، والمعنى له مصدر", () => {
    for (const m of MOMENTS) {
      expect(isValidRef(m.surah, m.ayahFrom) && isValidRef(m.surah, m.ayahTo)).toBe(true);
      if (m.meaning) expect(m.meaningSource).toBeTruthy();
    }
  });

  it("رموز الآيات في الدروس صالحة", () => {
    for (const p of LEARNING_PATHS)
      for (const l of p.lessons)
        for (const m of l.body.matchAll(/\[\[q:(\d+):(\d+)(?:-(\d+))?\]\]/g)) {
          expect(isValidRef(Number(m[1]), Number(m[2])), `${l.id} ${m[0]}`).toBe(true);
        }
  });
});
