import { describe, expect, it } from "vitest";
import { SERVICES } from "@/data/services";
import { SOLUTIONS } from "@/data/solutions";
import { UPDATES } from "@/data/updates";
import { VENTURES } from "@/data/ventures";
import { NAV } from "@/config/nav";

const unique = (list: string[]) => new Set(list).size === list.length;

describe("content data", () => {
  it("has unique slugs and ids", () => {
    expect(unique(SERVICES.map((s) => s.slug))).toBe(true);
    expect(unique(VENTURES.map((v) => v.slug))).toBe(true);
    expect(unique(UPDATES.map((u) => u.id))).toBe(true);
  });

  it("translates every text into both languages", () => {
    const check = (value: unknown, where: string): void => {
      if (value && typeof value === "object" && "ar" in value && "en" in value) {
        const { ar, en } = value as { ar: unknown; en: unknown };
        if (typeof ar === "string") {
          expect(ar.trim(), where).not.toBe("");
          expect((en as string).trim(), where).not.toBe("");
        } else if (Array.isArray(ar)) {
          expect(ar.length, where).toBe((en as unknown[]).length);
        }
        return;
      }
      if (value && typeof value === "object") for (const [key, inner] of Object.entries(value)) check(inner, `${where}.${key}`);
    };
    check({ SERVICES, VENTURES, SOLUTIONS, UPDATES }, "data");
  });

  it("links a product only when it is released, and only over https", () => {
    for (const venture of VENTURES) {
      if (venture.url) {
        expect(["live", "beta"], venture.slug).toContain(venture.status);
        expect(venture.url.startsWith("https://"), venture.slug).toBe(true);
      }
    }
    expect(VENTURES.filter((venture) => venture.status === "planned").every((venture) => !venture.url)).toBe(true);
  });

  it("only points solutions and updates at pages that exist", () => {
    const services = new Set(SERVICES.map((s) => s.slug));
    for (const solution of SOLUTIONS) for (const slug of solution.services) expect(services.has(slug), slug).toBe(true);
    const pages = new Set([...NAV.map((n) => n.path), ...SERVICES.map((s) => `/services/${s.slug}`), ...VENTURES.map((v) => `/ventures/${v.slug}`)]);
    for (const update of UPDATES) expect(pages.has(update.path), update.path).toBe(true);
  });

  it("lists updates newest first with valid dates", () => {
    const dates = UPDATES.map((u) => u.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    for (const date of dates) expect(Number.isNaN(new Date(date).getTime())).toBe(false);
  });
});
