import { describe, expect, it } from "vitest";
import { addRange, countRanges, firstUncovered, normalizeRanges, unionRanges } from "@/lib/ranges";
import { emptyState, hydrate } from "@/lib/store/defaults";
import { mergeStates } from "@/lib/store/merge";
import { goalProgress, khatmaProgress, pagesEquivalent, readingStreak, taskStatus } from "@/lib/store/progress";
import { SYNC_SLICES, type UserState } from "@/lib/store/types";
import { globalAyahId, TOTAL_AYAHS } from "@/lib/quran";
import { pickMomentForDay } from "@/lib/oasis";
import { safeNext } from "@/lib/safe-redirect";
import { parseRefs } from "@/components/admin/AdminCrud";

describe("المدى", () => {
  it("يدمج ويعدّ", () => {
    expect(normalizeRanges([[5, 9], [1, 3], [4, 4], [20, 21]])).toEqual([[1, 9], [20, 21]]);
    expect(countRanges(addRange([[1, 3]], [3, 6]))).toBe(6);
    expect(unionRanges([[1, 2]], [[10, 12]], [[3, 3]])).toEqual([[1, 3], [10, 12]]);
    expect(firstUncovered([[1, 7], [9, 10]], 1, 20)).toBe(8);
    expect(firstUncovered([[1, 20]], 1, 20)).toBeNull();
  });
});

describe("حساب التقدم", () => {
  it("الصفحة الأولى كاملة = صفحة واحدة، والمصحف كاملًا = 604", () => {
    expect(pagesEquivalent([[1, 7]])).toBeCloseTo(1);
    expect(pagesEquivalent([[1, TOTAL_AYAHS]])).toBeCloseTo(604);
  });

  it("الهدف اليومي", () => {
    const s = emptyState();
    s.settings.dailyGoal = { enabled: true, unit: "ayahs", amount: 10 };
    s.readingLog["2026-10-16"] = [[1, 7]];
    const g = goalProgress(s, "2026-10-16");
    expect(g.done).toBe(7);
    expect(g.reached).toBe(false);
  });

  it("سلسلة الأيام لا تنكسر قبل نهاية اليوم", () => {
    const s = emptyState();
    s.readingLog["2026-10-14"] = [[1, 1]];
    s.readingLog["2026-10-15"] = [[2, 2]];
    expect(readingStreak(s, "2026-10-16")).toBe(2);
    s.readingLog["2026-10-16"] = [[3, 3]];
    expect(readingStreak(s, "2026-10-16")).toBe(3);
  });

  it("الختمة تُحسب من آيات المصحف الفعلية", () => {
    const s = emptyState();
    s.readingLog["2026-10-01"] = [[1, globalAyahId(2, 141)]]; // الجزء الأول
    s.readingLog["2026-09-01"] = [[5000, 6000]]; // قبل بداية الختمة — لا يُحتسب
    const k = { id: "k", title: "t", startDate: "2026-10-01", days: 30, status: "active" as const, createdAt: "", updatedAt: "" };
    const p = khatmaProgress(k, s, "2026-10-02");
    expect(p.ayahsRead).toBe(148);
    expect(p.pagesRead).toBeCloseTo(21, 0);
    expect(p.next).toEqual({ surah: 2, ayah: 142 });
    expect(p.daysLeft).toBe(29);
  });

  it("المهمة اليدوية تتغلب على الإنجاز التلقائي", () => {
    const s = emptyState();
    s.settings.dailyGoal = { enabled: true, unit: "ayahs", amount: 5 };
    s.readingLog["2026-10-16"] = [[1, 7]];
    const task = { id: "t", type: "reading" as const, title: "ورد", active: true, order: 0, updatedAt: "" };
    expect(taskStatus(task, s, [], "2026-10-16")).toMatchObject({ done: true, auto: true });
    s.taskLog["2026-10-16"] = { t: { done: false, updatedAt: "x" } };
    expect(taskStatus(task, s, [], "2026-10-16").done).toBe(false);
  });
});

describe("المزامنة", () => {
  const a = (): UserState => {
    const s = emptyState();
    s.readingLog["d1"] = [[1, 5]];
    s.bookmarks["fav:1:1"] = { id: "fav:1:1", kind: "favorite", surah: 1, ayah: 1, createdAt: "1", updatedAt: "2026-01-01" };
    s.adhkarLog["d1"] = { x: { c: 3, updatedAt: "2026-01-01T10:00" } };
    return s;
  };
  const b = (): UserState => {
    const s = emptyState();
    s.readingLog["d1"] = [[4, 9]];
    s.bookmarks["fav:1:1"] = { id: "fav:1:1", kind: "favorite", surah: 1, ayah: 1, createdAt: "1", updatedAt: "2026-02-01", deleted: true };
    s.adhkarLog["d1"] = { x: { c: 0, updatedAt: "2026-01-01T11:00" } };
    return s;
  };

  it("الدمج تبادلي ولا يضيع القراءة، والأحدث يفوز", () => {
    const ab = mergeStates(a(), b(), SYNC_SLICES);
    const ba = mergeStates(b(), a(), SYNC_SLICES);
    expect(JSON.stringify(ab)).toBe(JSON.stringify(ba));
    expect(ab.readingLog["d1"]).toEqual([[1, 9]]);
    expect(ab.bookmarks["fav:1:1"].deleted).toBe(true);
    expect(ab.adhkarLog["d1"].x.c).toBe(0); // إعادة الضبط الأحدث تبقى
  });

  it("الاستعادة من بيانات تالفة أو ناقصة", () => {
    expect(hydrate(null).settings.fontScale).toBe(1);
    const h = hydrate({ settings: { theme: "dark" }, readingLog: "bad" });
    expect(h.settings.theme).toBe("dark");
    expect(h.settings.dailyGoal.amount).toBe(2);
    expect(h.readingLog).toEqual({});
  });
});

describe("متفرقات", () => {
  it("لحظة اليوم: المجدولة أولًا ثم المكتبة، ولا محتوى = null", () => {
    const lib = [{ id: "a", surah: 1, ayahFrom: 1, ayahTo: 1 }, { id: "b", surah: 1, ayahFrom: 2, ayahTo: 2 }];
    const sched = { id: "s", surah: 2, ayahFrom: 255, ayahTo: 255, publishDate: "2026-10-16" };
    expect(pickMomentForDay([...lib, sched], "2026-10-16")?.id).toBe("s");
    expect(["a", "b"]).toContain(pickMomentForDay(lib, "2026-10-17")?.id);
    expect(pickMomentForDay(lib, "2026-10-17")?.id).not.toBe(pickMomentForDay(lib, "2026-10-18")?.id);
    expect(pickMomentForDay([], "2026-10-16")).toBeNull();
  });

  it("منع إعادة التوجيه المفتوحة", () => {
    expect(safeNext("/plan")).toBe("/plan");
    expect(safeNext("//evil.com")).toBe("/today");
    expect(safeNext("https://evil.com")).toBe("/today");
    expect(safeNext("/\\evil.com")).toBe("/today");
  });

  it("تحليل المراجع القرآنية في لوحة الإدارة", () => {
    expect(parseRefs("2:255-255\n112:1-4")).toEqual([
      { surah: 2, from: 255, to: 255 },
      { surah: 112, from: 1, to: 4 },
    ]);
    expect(parseRefs("")).toBeNull();
    expect(() => parseRefs("abc")).toThrow();
  });
});
