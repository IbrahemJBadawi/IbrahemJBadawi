"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ShareButtons({ url, text }: { url: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const full = `${text}\n${url}`;
  const enc = encodeURIComponent;
  const links = [
    { label: "واتساب", href: `https://wa.me/?text=${enc(full)}` },
    { label: "تيليجرام", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}` },
    { label: "فيسبوك", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { label: "X", href: `https://x.com/intent/post?text=${enc(full)}` },
  ];
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg border border-brand-800/30 bg-panel px-3 font-semibold text-brand-800 hover:bg-brand-50">
          {l.label}
        </a>
      ))}
      <Button type="button" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(full); setCopied(true); }}>
        {copied ? "تم النسخ ✓" : "نسخ الرابط"}
      </Button>
      <Button type="button" onClick={() => window.print()}>طباعة / حفظ PDF</Button>
    </div>
  );
}
