"use client";

import { useRef, useState } from "react";
import { ZoomIn, X } from "lucide-react";
import type { ProductImage as Img } from "@/lib/data/catalog";
import { ProductImage } from "./ProductImage";

export function Gallery({ images, name }: { images: Img[]; name: string }) {
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = images[active];
  return (
    <>
      <div className="space-y-3">
      <button
        type="button"
        className="group relative block aspect-[3/4] w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-sand text-start shadow-[var(--shadow-card)] disabled:cursor-default"
        onClick={() => dialogRef.current?.showModal()}
        disabled={!current?.url}
        aria-label={`تكبير صورة ${name}`}
      >
        <ProductImage src={current?.url} alt={current?.alt || name} sizes="(min-width: 1024px) 50vw, 100vw" priority />
        {current?.url && (
          <span className="absolute bottom-4 start-4 inline-flex items-center gap-2 rounded-full border border-white/60 bg-paper/90 px-3 py-2 text-xs font-bold text-ink shadow-sm backdrop-blur transition-transform duration-200 group-hover:scale-105">
            <ZoomIn className="size-4" strokeWidth={1.8} /> تكبير الصورة
          </span>
        )}
      </button>
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
              className={`relative aspect-[3/4] w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-[opacity,border-color,transform] duration-200 hover:-translate-y-0.5 md:w-20 ${i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100"}`}
            >
              <ProductImage src={img.url} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}
      </div>
      <dialog
        ref={dialogRef}
        aria-label={`معاينة مكبرة لصورة ${name}`}
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }}
        className="fixed inset-0 m-auto max-h-[96dvh] max-w-[96vw] overflow-visible rounded-[var(--radius-card)] border border-line bg-paper p-3 shadow-2xl backdrop:bg-ink/85"
      >
        <div className="mb-2 flex items-center justify-between gap-4 px-2">
          <span className="line-clamp-1 text-sm font-bold text-ink">{name}</span>
          <button type="button" onClick={() => dialogRef.current?.close()} className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink transition-colors hover:bg-beige/50" aria-label="إغلاق الصورة المكبرة">
            <X className="size-5" strokeWidth={1.8} />
          </button>
        </div>
        <div className="relative aspect-[3/4] w-[min(80vw,32rem)] max-h-[78dvh] overflow-hidden rounded-xl bg-sand">
          <ProductImage src={current?.url} alt={current?.alt || name} sizes="(min-width: 768px) 512px, 85vw" />
        </div>
      </dialog>
    </>
  );
}
