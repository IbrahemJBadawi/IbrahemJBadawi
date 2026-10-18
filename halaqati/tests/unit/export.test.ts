import { describe, expect, it } from "vitest";
import { safeFileName, toCsv, toXlsx } from "@/lib/export";

const t = { title: "طلاب", columns: [{ key: "a", label: "الاسم" }, { key: "b", label: "النقاط" }], rows: [{ a: 'أحمد "الصغير"', b: 10 }, { a: "=HYPERLINK(1)", b: null }] };

describe("exports", () => {
  it("CSV has a BOM, escapes quotes and neutralises formulas", () => {
    const csv = toCsv(t);
    expect(csv.startsWith("﻿الاسم,النقاط\r\n")).toBe(true);
    expect(csv).toContain('"أحمد ""الصغير"""');
    expect(csv).toContain("'=HYPERLINK(1),");
  });
  it("XLSX is a zip file", async () => {
    const buf = new Uint8Array(await toXlsx(t));
    expect([buf[0], buf[1]]).toEqual([0x50, 0x4b]);
  });
  it("file names are safe", () => {
    expect(safeFileName('../حلقة "الفجر"')).toBe("حلقة-الفجر");
  });
});
