"use client";

import { useState } from "react";
import type { ProductImage as Img } from "@/lib/data/catalog";
import { ProductImage } from "./ProductImage";

export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[var(--radius-card)] bg-sand">
        <ProductImage src={current?.url} alt={current?.alt || name} sizes="(min-width: 1024px) 50vw, 100vw" priority />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="صور المنتج">
          {images.map((img, i) => (
            <button
              key={img.url + i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`الصورة ${i + 1}`}
              onClick={() => setActive(i)}
              className={`relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-[var(--radius-card)] border-2 md:w-20 ${i === active ? "border-ink" : "border-transparent opacity-70"}`}
            >
              <ProductImage src={img.url} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
