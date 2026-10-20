"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import type { Variant } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/money";
import { cart } from "@/components/cart/cart-store";
import { Button, buttonClass } from "@/components/ui/Button";

export function AddToCart({
  productId,
  variants,
  available,
  currency,
}: {
  productId: string;
  variants: Variant[];
  available: boolean;
  currency: string;
}) {
  const colors = useMemo(() => {
    const m = new Map<string, string | null>();
    variants.forEach((v) => v.color_name && !m.has(v.color_name) && m.set(v.color_name, v.color_hex));
    return [...m.entries()];
  }, [variants]);
  const sizes = useMemo(() => [...new Set(variants.map((v) => v.size).filter(Boolean) as string[])], [variants]);

  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0][0] : null);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0] : null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const match = variants.find((v) => (colors.length ? v.color_name === color : true) && (sizes.length ? v.size === size : true));
  const sizeAvailable = (s: string) => variants.some((v) => v.size === s && (!color || v.color_name === color) && v.availability === "available");

  function add() {
    setError(null);
    if (variants.length) {
      if (colors.length && !color) return setError("يرجى اختيار اللون.");
      if (sizes.length && !size) return setError("يرجى اختيار المقاس.");
      if (!match) return setError("هذا الخيار غير متوفر.");
      if (match.availability !== "available") return setError("هذا الخيار غير متوفر حاليًا.");
    }
    cart.add(productId, match?.id ?? null, qty);
    setAdded(true);
  }

  const chip = (on: boolean, disabled = false) =>
    `min-w-12 rounded-[var(--radius-card)] border px-3 py-2 text-sm transition-colors ${
      on ? "border-ink bg-ink text-ivory" : "border-line bg-paper hover:border-ink/60"
    } ${disabled ? "text-muted line-through opacity-60" : ""}`;

  return (
    <div className="space-y-6 max-md:contents">
      {colors.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">
            اللون: <span className="font-normal text-muted">{color ?? "اختر"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {colors.map(([name, hex]) => (
              <button key={name} type="button" onClick={() => { setColor(name); setAdded(false); }} aria-pressed={color === name} className={`${chip(color === name)} inline-flex items-center gap-2`}>
                {hex && <span className="size-4 rounded-full border border-line" style={{ backgroundColor: hex }} />}
                {name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">
            المقاس: <span className="font-normal text-muted">{size ?? "اختر"}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => {
              const ok = sizeAvailable(s);
              return (
                <button key={s} type="button" onClick={() => { setSize(s); setAdded(false); }} aria-pressed={size === s} className={chip(size === s, !ok)} aria-label={ok ? s : `${s} غير متوفر`}>
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {match?.price_override && (
        <p className="text-sm text-muted">سعر هذا الخيار: <strong className="text-ink">{formatMoney(match.price_override, currency)}</strong></p>
      )}
      <div className="z-30 flex items-stretch gap-3 max-md:sticky max-md:bottom-[calc(5.5rem+env(safe-area-inset-bottom))] max-md:-mx-2 max-md:rounded-full max-md:bg-ivory/90 max-md:p-2 max-md:shadow-[0_8px_24px_-12px_rgba(29,27,24,0.35)] max-md:backdrop-blur">
        <div className="flex items-center rounded-full border border-line bg-paper">
          <button type="button" className="flex size-11 items-center justify-center disabled:opacity-40" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="إنقاص الكمية">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-sm font-bold" aria-live="polite" aria-label={`الكمية ${qty}`}>{qty}</span>
          <button type="button" className="flex size-11 items-center justify-center disabled:opacity-40" onClick={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} aria-label="زيادة الكمية">
            <Plus className="size-4" />
          </button>
        </div>
        <Button size="lg" className="flex-1" onClick={add} disabled={!available}>
          {available ? "أضف إلى السلة" : "غير متوفر حاليًا"}
        </Button>
      </div>
      {error && <p className="text-sm font-medium text-danger" role="alert">{error}</p>}
      {added && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-success/30 bg-success/5 px-4 py-3" role="status">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-success">
            <Check className="size-4" /> تمت الإضافة إلى السلة
          </span>
          <Link href="/cart" className={buttonClass("outline", "sm")}>عرض السلة</Link>
        </div>
      )}
    </div>
  );
}
