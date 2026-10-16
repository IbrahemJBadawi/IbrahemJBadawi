import { describe, expect, it } from "vitest";
import { BADGES, LEVELS, evaluateBadges, levelFor } from "@/lib/levels";

describe("levels", () => {
  it("maps points to the right level and progress", () => {
    expect(levelFor(0)).toMatchObject({ index: 1, toNext: 50, progress: 0 });
    expect(levelFor(100)).toMatchObject({ index: 2, toNext: 50, progress: 50 });
    expect(levelFor(150).current.title).toBe("مجتهد");
    expect(levelFor(99999)).toMatchObject({ index: LEVELS.length, next: null, progress: 100 });
    expect(levelFor(-5).index).toBe(1);
  });
  it("levels are strictly increasing", () => {
    for (let i = 1; i < LEVELS.length; i++) expect(LEVELS[i].min).toBeGreaterThan(LEVELS[i - 1].min);
  });
});

describe("badges", () => {
  it("earns a badge exactly at its goal", () => {
    const zero = { recitations: 0, new_ayat: 0, review_ayat: 0, attended: 0, wird_days: 0, tasks_done: 0, certificates: 0, reactions_received: 0, points_total: 0, longest_streak: 0 };
    expect(evaluateBadges(zero).every((b) => !b.earned)).toBe(true);
    const r = evaluateBadges({ ...zero, recitations: 1, longest_streak: 7, new_ayat: 50 });
    expect(r.find((b) => b.key === "first_recitation")?.earned).toBe(true);
    expect(r.find((b) => b.key === "streak_7")?.earned).toBe(true);
    expect(r.find((b) => b.key === "streak_30")?.earned).toBe(false);
    expect(r.find((b) => b.key === "ayat_100")?.progress).toBe(50);
    expect(new Set(BADGES.map((b) => b.key)).size).toBe(BADGES.length);
  });
});
