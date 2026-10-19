import { describe, expect, it } from "vitest";
import { href, isLocale, stripLocale } from "@/i18n/config";

describe("language paths", () => {
  it("keeps Arabic at the root and English under /en", () => {
    expect(href("ar", "/")).toBe("/");
    expect(href("ar", "/about")).toBe("/about");
    expect(href("en", "/")).toBe("/en");
    expect(href("en", "/ventures/halaqati")).toBe("/en/ventures/halaqati");
  });

  it("strips the language prefix", () => {
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/en/about")).toBe("/about");
    expect(stripLocale("/ar/about")).toBe("/about");
    expect(stripLocale("/english")).toBe("/english");
  });

  it("knows the supported languages", () => {
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});
