"use client";

import { Icon } from "@/components/Icon";
import { DownloadImage } from "./DownloadImage";

/**
 * Excel / CSV come from /api/export (the data the viewer may see, checked by
 * the database); PDF uses the browser's print dialog ("Save as PDF");
 * the image is a PNG of the page content.
 */
export function ExportBar({ type, id, fileName, targetId = "main" }: { type?: string; id?: string; fileName: string; targetId?: string }) {
  const href = (format: "xlsx" | "csv") => `/api/export?${new URLSearchParams({ type: type ?? "", format, ...(id ? { id } : {}) })}`;
  const cls = "btn btn-secondary !min-h-9 !px-3 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden" data-no-export="true" role="group" aria-label="تصدير">
      <span className="text-sm text-muted">تصدير:</span>
      {type && <a href={href("xlsx")} className={cls}><Icon name="list" size={18} />Excel</a>}
      {type && <a href={href("csv")} className={cls}>CSV</a>}
      <button type="button" className={cls} onClick={() => window.print()}><Icon name="book" size={18} />PDF / طباعة</button>
      <DownloadImage targetId={targetId} fileName={fileName} label="صورة" className={cls} />
    </div>
  );
}
