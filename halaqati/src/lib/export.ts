/** Tabular exports (pure): CSV for any spreadsheet, XLSX via exceljs. */
export type Column = { key: string; label: string; width?: number };
export type Table = { title: string; columns: Column[]; rows: Array<Record<string, unknown>> };

const cell = (v: unknown) => (v === null || v === undefined ? "" : Array.isArray(v) ? v.join("، ") : String(v));

/** RFC 4180 CSV with a UTF-8 BOM so Excel shows Arabic correctly; formula-like cells are neutralised. */
export function toCsv(t: Table): string {
  const esc = (v: unknown) => {
    let s = cell(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [t.columns.map((c) => esc(c.label)).join(","), ...t.rows.map((r) => t.columns.map((c) => esc(r[c.key])).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function toXlsx(t: Table): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "حلقتي";
  const ws = wb.addWorksheet(t.title.slice(0, 31).replace(/[\\/?*[\]:]/g, " "), { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  ws.columns = t.columns.map((c) => ({ header: c.label, key: c.key, width: c.width ?? Math.max(12, c.label.length + 4) }));
  for (const r of t.rows) {
    ws.addRow(Object.fromEntries(t.columns.map((c) => {
      const v = r[c.key];
      return [c.key, typeof v === "number" ? v : cell(v)];
    })));
  }
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF075B46" } };
  head.alignment = { vertical: "middle", horizontal: "right" };
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

export function safeFileName(s: string) {
  return s.replace(/[^\p{L}\p{N}\- ]/gu, "").trim().replace(/\s+/g, "-").slice(0, 60) || "halaqati";
}
