"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui";
import { SURAHS, getSurah, measureRange } from "@/lib/quran/surahs";

type Props = {
  errors?: Record<string, string>;
  defaults?: { surahFrom?: number; ayahFrom?: number; surahTo?: number; ayahTo?: number };
  idPrefix?: string;
};

/** Surah/ayah range picker with live ayah count; server re-validates. */
export function SurahRangeFields({ errors = {}, defaults = {}, idPrefix = "" }: Props) {
  const [v, setV] = useState({
    surahFrom: defaults.surahFrom ?? 1,
    ayahFrom: defaults.ayahFrom ?? 1,
    surahTo: defaults.surahTo ?? defaults.surahFrom ?? 1,
    ayahTo: defaults.ayahTo ?? 1,
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const n = Number(e.target.value);
    setV((prev) => {
      const next = { ...prev, [k]: n };
      if (k === "surahFrom" && next.surahTo < n) next.surahTo = n;
      return next;
    });
  };
  const result = measureRange(v);
  const id = (n: string) => `${idPrefix}${n}`;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="من سورة" name={id("surahFrom")}>
        <Select id={id("surahFrom")} name="surahFrom" value={v.surahFrom} onChange={set("surahFrom")}>
          {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
        </Select>
      </Field>
      <Field label="من آية" name={id("ayahFrom")} error={errors.ayahFrom}>
        <Input id={id("ayahFrom")} name="ayahFrom" type="number" inputMode="numeric" min={1} max={getSurah(v.surahFrom)?.ayahCount} value={v.ayahFrom} onChange={set("ayahFrom")} />
      </Field>
      <Field label="إلى سورة" name={id("surahTo")}>
        <Select id={id("surahTo")} name="surahTo" value={v.surahTo} onChange={set("surahTo")}>
          {SURAHS.filter((s) => s.number >= v.surahFrom).map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
        </Select>
      </Field>
      <Field label="إلى آية" name={id("ayahTo")} error={errors.ayahTo}>
        <Input id={id("ayahTo")} name="ayahTo" type="number" inputMode="numeric" min={1} max={getSurah(v.surahTo)?.ayahCount} value={v.ayahTo} onChange={set("ayahTo")} />
      </Field>
      <p className="col-span-2 text-sm" aria-live="polite">
        {result.ok ? <span className="text-muted">المقدار: <strong className="text-ink">{result.ayahCount}</strong> آية</span> : <span className="font-semibold text-danger">{result.error}</span>}
      </p>
    </div>
  );
}

export function ScoreSelect({ name, label, error, defaultValue, id }: { name: string; label: string; error?: string; defaultValue?: number | null; id?: string }) {
  return (
    <Field label={label} name={id ?? name} error={error}>
      <Select id={id ?? name} name={name} defaultValue={defaultValue ?? ""} aria-invalid={!!error}>
        <option value="">—</option>
        <option value="5">5 — ممتاز</option>
        <option value="4">4 — جيد جدًا</option>
        <option value="3">3 — جيد</option>
        <option value="2">2 — مقبول</option>
        <option value="1">1 — ضعيف</option>
      </Select>
    </Field>
  );
}
