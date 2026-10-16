"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { t } from "@/lib/i18n/ar";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";

type Options = { sizes: string[]; colors: { name: string; hex: string | null }[] };

export function Filters({ options, showSaleToggle = true }: { options: Options; showSaleToggle?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [allSizes, setAllSizes] = useState(false);
  const selectedSize = params.get("size");
  const sizes = allSizes || options.sizes.length <= 12 ? options.sizes : options.sizes.slice(0, 12);
  const [pending, startTransition] = useTransition();

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    next.delete("page");
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  const active = ["size", "color", "min", "max", "sale"].filter((k) => params.get(k));
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-ink bg-ink text-ivory" : "border-line bg-paper text-ink hover:border-ink/50"}`;

  const panel = (
    <div className="space-y-7">
      {options.sizes.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">المقاس</legend>
          <div className="flex flex-wrap gap-2">
            {(selectedSize && !sizes.includes(selectedSize) ? [...sizes, selectedSize] : sizes).map((s) => (
              <button key={s} type="button" className={chip(params.get("size") === s)} onClick={() => update({ size: params.get("size") === s ? null : s })} aria-pressed={params.get("size") === s}>
                {s}
              </button>
            ))}
          </div>
          {options.sizes.length > 12 && (
            <button type="button" className="mt-3 text-xs font-semibold text-beige-deep underline underline-offset-4" onClick={() => setAllSizes((v) => !v)}>
              {allSizes ? "عرض أقل" : `عرض كل المقاسات (${options.sizes.length})`}
            </button>
          )}
        </fieldset>
      )}
      {options.colors.length > 0 && (
        <fieldset>
          <legend className="mb-3 text-sm font-bold">اللون</legend>
          <div className="flex flex-wrap gap-2">
            {options.colors.map((c) => (
              <button key={c.name} type="button" className={`${chip(params.get("color") === c.name)} inline-flex items-center gap-2`} onClick={() => update({ color: params.get("color") === c.name ? null : c.name })} aria-pressed={params.get("color") === c.name}>
                {c.hex && <span className="size-3.5 rounded-full border border-line" style={{ backgroundColor: c.hex }} />}
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="mb-3 text-sm font-bold">السعر</legend>
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            update({ min: String(fd.get("min") ?? ""), max: String(fd.get("max") ?? "") });
          }}
        >
          <input name="min" type="number" min={0} inputMode="decimal" placeholder="من" defaultValue={params.get("min") ?? ""} className={inputClass} aria-label="أقل سعر" />
          <input name="max" type="number" min={0} inputMode="decimal" placeholder="إلى" defaultValue={params.get("max") ?? ""} className={inputClass} aria-label="أعلى سعر" />
          <Button type="submit" variant="secondary" size="sm" className="h-[2.65rem]">تطبيق</Button>
        </form>
      </fieldset>
      {showSaleToggle && (
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-ink" checked={params.get("sale") === "1"} onChange={(e) => update({ sale: e.target.checked ? "1" : null })} />
          المنتجات المخفّضة فقط
        </label>
      )}
      {active.length > 0 && (
        <button type="button" className="text-sm font-semibold text-beige-deep underline underline-offset-4" onClick={() => update({ size: null, color: null, min: null, max: null, sale: null })}>
          مسح الفلاتر
        </button>
      )}
    </div>
  );

  return (
    <div className={pending ? "opacity-70 transition-opacity" : ""}>
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-card)] border border-line bg-paper px-4 text-sm font-semibold lg:hidden" aria-expanded={open}>
          <SlidersHorizontal className="size-4" />
          الفلاتر {active.length > 0 && <span className="rounded-full bg-ink px-1.5 text-xs text-ivory">{active.length}</span>}
        </button>
        <label className="ms-auto flex items-center gap-2 text-sm lg:ms-0 lg:w-full">
          <span className="shrink-0 whitespace-nowrap text-muted max-sm:sr-only">ترتيب حسب</span>
          <select className={`${inputClass} h-11 w-auto py-2 leading-normal lg:flex-1`} value={params.get("sort") ?? "newest"} onChange={(e) => update({ sort: e.target.value === "newest" ? null : e.target.value })}>
            {Object.entries(t.sort).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <aside className="mt-8 hidden lg:block" aria-label="الفلاتر">{panel}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="الفلاتر">
          <button type="button" className="absolute inset-0 bg-ink/40" aria-label="إغلاق" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-ivory p-6 pb-10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold">الفلاتر</h2>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand" aria-label="إغلاق">
                <X className="size-5" />
              </button>
            </div>
            {panel}
            <Button className="mt-8 w-full" onClick={() => setOpen(false)}>عرض النتائج</Button>
          </div>
        </div>
      )}
    </div>
  );
}
