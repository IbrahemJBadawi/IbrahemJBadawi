"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";

/** Saves an element of the page as a PNG (drawn in the browser, nothing is uploaded). */
export function DownloadImage({ targetId, fileName, label = "تنزيل صورة", className = "btn btn-secondary" }: { targetId: string; fileName: string; label?: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    const el = document.getElementById(targetId);
    if (!el) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const bg = getComputedStyle(document.body).backgroundColor;
      const url = await toPng(el, { pixelRatio: 2, backgroundColor: bg, cacheBust: true, filter: (n) => !(n instanceof HTMLElement && n.dataset.noExport === "true") });
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName}.png`;
      a.click();
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className={className} onClick={run} disabled={busy} aria-busy={busy}>
      <Icon name="install" size={18} />{busy ? "جارٍ التجهيز…" : label}
    </button>
  );
}
