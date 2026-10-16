"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { addDays, dayKey } from "@/lib/date";
import { getSurahMeta, SURAHS } from "@/lib/quran";
import { logReadingRef } from "@/lib/store/actions";

/** تسجيل قراءة يدويًا (لمن يقرأ من المصحف الورقي أو تطبيق آخر). */
export function ManualLog() {
  const toast = useToast();
  const [surah, setSurah] = useState(1);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("7");
  const [day, setDay] = useState<"today" | "yesterday">("today");
  const meta = getSurahMeta(surah)!;
  const f = Number(from);
  const t = Number(to);
  const valid = Number.isInteger(f) && Number.isInteger(t) && f >= 1 && t >= f && t <= meta.ayahs;
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        logReadingRef(surah, f, t, day === "today" ? dayKey() : addDays(dayKey(), -1));
        toast(`سُجّلت قراءة ${meta.name} ${f}–${t}`);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="السورة">
          {(id) => (
            <Select
              id={id}
              value={surah}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSurah(n);
                setFrom("1");
                setTo(String(getSurahMeta(n)!.ayahs));
              }}
            >
              {SURAHS.map((s) => (
                <option key={s.n} value={s.n}>
                  {s.n}. {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="من الآية">{(id) => <Input id={id} type="number" min={1} max={meta.ayahs} value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
        <Field label="إلى الآية">{(id) => <Input id={id} type="number" min={1} max={meta.ayahs} value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
        <Field label="اليوم">
          {(id) => (
            <Select id={id} value={day} onChange={(e) => setDay(e.target.value as "today" | "yesterday")}>
              <option value="today">اليوم</option>
              <option value="yesterday">أمس</option>
            </Select>
          )}
        </Field>
      </div>
      {!valid && <p className="text-xs text-danger">تحقق من أرقام الآيات (السورة {meta.ayahs} آية).</p>}
      <Button type="submit" variant="secondary" disabled={!valid}>
        تسجيل القراءة
      </Button>
    </form>
  );
}
