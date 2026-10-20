"use client";

import { BookOpen, CalendarClock, Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge, Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/Form";
import { EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { dayKey, daysBetween, formatShortDate } from "@/lib/date";
import { getSurahMeta, SURAHS, toArabicDigits } from "@/lib/quran";
import { addHifzSegment, deleteHifzSegment, recordHifzReview, updateHifzSegment } from "@/lib/store/actions";
import { dueHifz, hifzStats } from "@/lib/store/progress";
import { useHydrated, useStore } from "@/lib/store/store";
import type { HifzSegment } from "@/lib/store/types";

function label(s: HifzSegment) {
  const m = getSurahMeta(s.surah);
  return `سورة ${m?.name} · ${s.from === s.to ? `الآية ${toArabicDigits(s.from)}` : `الآيات ${toArabicDigits(s.from)}–${toArabicDigits(s.to)}`}`;
}

function relativeDue(next: string, today: string) {
  const d = daysBetween(today, next);
  if (d < 0) return `متأخرة ${toArabicDigits(-d)} يومًا`;
  if (d === 0) return "اليوم";
  if (d === 1) return "غدًا";
  return `بعد ${toArabicDigits(d)} أيام`;
}

function AddSegment({ onAdded }: { onAdded: () => void }) {
  const toast = useToast();
  const [surah, setSurah] = useState(78);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("5");
  const [status, setStatus] = useState<"learning" | "memorized">("learning");
  const [notes, setNotes] = useState("");
  const meta = getSurahMeta(surah)!;
  const f = Number(from);
  const t = Number(to);
  const valid = Number.isInteger(f) && Number.isInteger(t) && f >= 1 && t >= f && t <= meta.ayahs;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        addHifzSegment({ surah, from: f, to: t, status, notes });
        toast("سُجّل المقطع، وستُذكَّر بمراجعته غدًا");
        setNotes("");
        onAdded();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="السورة">
          {(id) => (
            <Select
              id={id}
              value={surah}
              onChange={(e) => {
                const n = Number(e.target.value);
                setSurah(n);
                setFrom("1");
                setTo(String(Math.min(5, getSurahMeta(n)!.ayahs)));
              }}
            >
              {SURAHS.map((s) => (
                <option key={s.n} value={s.n}>
                  {s.n}. {s.name} ({s.ayahs})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="من الآية">{(id) => <Input id={id} type="number" min={1} max={meta.ayahs} value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
        <Field label="إلى الآية">{(id) => <Input id={id} type="number" min={1} max={meta.ayahs} value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
      </div>
      {!valid && <p className="text-xs text-danger">تحقق من أرقام الآيات (سورة {meta.name}: {meta.ayahs} آية).</p>}
      <div>
        <p className="mb-1.5 text-sm font-semibold">الحالة</p>
        <Segmented
          label="حالة المقطع"
          value={status}
          onChange={setStatus}
          options={[
            { value: "learning", label: "أحفظه الآن" },
            { value: "memorized", label: "محفوظ سابقًا" },
          ]}
        />
      </div>
      <Field label="ملاحظات (اختياري)" hint="مثل: مواضع التشابه أو الكلمات التي أخطئ فيها">
        {(id, d) => <Textarea id={id} aria-describedby={d} value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />}
      </Field>
      <Button type="submit" disabled={!valid}>
        <Plus className="h-5 w-5" aria-hidden="true" />
        تسجيل المقطع
      </Button>
    </form>
  );
}

function SegmentItem({ s, today }: { s: HifzSegment; today: string }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState(s.notes);
  const [confirm, setConfirm] = useState(false);
  const due = s.nextReview <= today;
  return (
    <li className="py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{label(s)}</p>
          <p className="text-xs text-muted">
            {s.status === "memorized" ? "محفوظ" : "قيد الحفظ"} · المراجعة القادمة: {relativeDue(s.nextReview, today)} · {toArabicDigits(s.reviews.length)} مراجعة
          </p>
        </div>
        <div className="flex items-center gap-1">
          {due && <Badge tone="gold">مستحقة</Badge>}
          <Link href={`/quran/${s.surah}?ayah=${s.from}`} className="rounded-full p-2 text-muted hover:bg-surface-2 focus-ring" aria-label={`فتح ${label(s)} في المصحف`}>
            <BookOpen className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => setEditing((e) => !e)} className="rounded-full p-2 text-muted hover:bg-surface-2 focus-ring" aria-label="تعديل الملاحظات">
            <Pencil className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setConfirm(true)} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-danger focus-ring" aria-label="حذف المقطع">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          <Textarea aria-label="ملاحظات المقطع" value={notes} maxLength={2000} onChange={(e) => setNotes(e.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                updateHifzSegment(s.id, { notes });
                setEditing(false);
                toast("حُفظت الملاحظات");
              }}
            >
              حفظ
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              إلغاء
            </Button>
          </div>
        </div>
      ) : (
        s.notes && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm">{s.notes}</p>
      )}
      <ConfirmDialog
        open={confirm}
        danger
        title="حذف المقطع"
        message={`سيُحذف «${label(s)}» وسجل مراجعاته. هل أنت متأكد؟`}
        confirmLabel="حذف"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          deleteHifzSegment(s.id);
          toast("حُذف المقطع");
        }}
      />
    </li>
  );
}

export function HifzView() {
  const hydrated = useHydrated();
  const hifz = useStore((s) => s.hifz);
  const toast = useToast();
  const today = dayKey();
  const [adding, setAdding] = useState(false);
  const stats = useMemo(() => hifzStats({ hifz }), [hifz]);
  const due = useMemo(() => dueHifz({ hifz }, today), [hifz, today]);
  const all = useMemo(
    () => Object.values(hifz).filter((h) => !h.deleted).sort((a, b) => a.surah - b.surah || a.from - b.from),
    [hifz],
  );

  if (!hydrated) return <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />;

  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "آيات محفوظة", v: stats.memorizedAyahs },
          { k: "قيد الحفظ", v: stats.learningAyahs },
          { k: "مقاطع", v: stats.segments },
          { k: "مراجعات مسجلة", v: stats.reviews },
        ].map((x) => (
          <li key={x.k} className="rounded-2xl bg-surface-2 p-4">
            <p className="text-2xl font-bold tabular-nums">{toArabicDigits(x.v)}</p>
            <p className="text-sm text-muted">{x.k}</p>
          </li>
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<CalendarClock className="h-5 w-5" />}>مراجعة اليوم</CardTitle>
          {due.length ? (
            <ul className="space-y-3">
              {due.map((s) => (
                <li key={s.id} className="rounded-2xl border border-line p-4">
                  <p className="font-bold">{label(s)}</p>
                  <p className="text-xs text-muted">
                    {s.nextReview < today ? relativeDue(s.nextReview, today) : "مستحقة اليوم"}
                    {s.reviews.length ? ` · آخر مراجعة ${formatShortDate(s.reviews[s.reviews.length - 1].date)}` : ""}
                  </p>
                  {s.notes && <p className="mt-2 line-clamp-2 text-sm text-muted">ملاحظة: {s.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={`/quran/${s.surah}?ayah=${s.from}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold hover:bg-surface-2 focus-ring">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      افتح المقطع
                    </Link>
                    <Button
                      size="sm"
                      onClick={() => {
                        recordHifzReview(s.id, "good");
                        toast("أحسنت! سُجّلت المراجعة وتباعد موعد المراجعة التالية");
                      }}
                    >
                      <Check className="h-4 w-4" aria-hidden="true" />
                      راجعته — ثابت
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        recordHifzReview(s.id, "weak");
                        toast("سُجّلت المراجعة، وسنعيده لك غدًا للتثبيت");
                      }}
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      يحتاج تثبيتًا
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="لا مراجعات مستحقة اليوم" icon={<Check className="h-6 w-6" />}>
              {all.length ? "أحسنت، أنت على اطلاع بمراجعاتك." : "سجّل أول مقطع تحفظه لتبدأ جدولة المراجعة."}
            </EmptyState>
          )}
          <p className="mt-4 text-xs text-muted">
            تتباعد المراجعات تدريجيًا (يوم، ٣ أيام، أسبوع، أسبوعان، شهر، شهران)، وتعود للبداية إذا احتاج المقطع إلى تثبيت.
          </p>
        </Card>

        <Card>
          <CardTitle
            icon={<Plus className="h-5 w-5" />}
            action={
              all.length && !adding ? (
                <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
                  مقطع جديد
                </Button>
              ) : null
            }
          >
            تسجيل محفوظ جديد
          </CardTitle>
          {all.length && !adding ? (
            <p className="text-sm text-muted">سجّل كل مقطع تحفظه، مع ملاحظاتك الخاصة به.</p>
          ) : (
            <AddSegment onAdded={() => setAdding(false)} />
          )}
        </Card>
      </div>

      {all.length > 0 && (
        <Card>
          <CardTitle icon={<BookOpen className="h-5 w-5" />}>كل المقاطع</CardTitle>
          <ul className="divide-y divide-line">
            {all.map((s) => (
              <SegmentItem key={s.id} s={s} today={today} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
