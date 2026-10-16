"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyButton({ text, label = "نسخ" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setFailed(false);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setFailed(true);
        }
      }}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-paper px-3 text-sm font-semibold hover:border-ink"
    >
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      {copied ? "تم النسخ" : failed ? "تعذّر النسخ — انسخ النص يدويًا" : label}
    </button>
  );
}
