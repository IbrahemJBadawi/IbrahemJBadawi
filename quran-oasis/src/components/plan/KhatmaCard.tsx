"use client";

import { BookOpen, Pause, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge, Card, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Form";
import { ProgressBar } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { dayKey, formatShortDate } from "@/lib/date";
import { getSurahMeta, toArabicDigits } from "@/lib/quran";
import { createKhatma, deleteKhatma, updateKhatma } from "@/lib/store/actions";
import { formatAmount, khatmaProgress } from "@/lib/store/progress";
import { useStore } from "@/lib/store/store";
import type { Khatma } from "@/lib/store/types";

const DURATIONS = [7, 15, 30, 60, 90, 180, 365];

function NewKhatmaForm({ onDone }: { onDone?: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState("ختمتي");
  const [start, setStart] = useState(dayKey());
  const [days, setDays] = useState("30");
  const n = Number(days);
  const valid = Number.isInteger(n) && n >= 1 && n <= 3650 && /^\d{4}-\d{2}-\d{2}$/.test(start);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        createKhatma(title, start, n);
        toast("أُنشئت خطة الختمة، يسّر الله لك");
        onDone?.();
      }}
    >
      <Field label="اسم الخطة">{(id) => <Input id={id} value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="تاريخ البداية" hint="تُحتسب القراءة من هذا التاريخ">
          {(id, d) => <Input id={id} aria-describedby={d} type="date" value={start} onChange={(e) => setStart(e.target.value)} />}
        </Field>
        <Field label="المدة بالأيام" error={!valid ? "أدخل مدة بين 1 و3650 يومًا" : null}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} type="number" inputMode="numeric" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} />
          )}
        </Field>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="مدد مقترحة">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(String(d))}
            className={`h-9 rounded-full px-3.5 text-sm font-semibold focus-ring ${n === d ? "bg-primary text-primary-fg" : "bg-surface-2"}`}
          >
            {d === 365 ? "سنة" : `${d} يومًا`}
          </button>
        ))}
      </div>
      {valid && (
        <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">
          بمعدل نحو <strong className="text-fg">{formatAmount(604 / n)}</strong> صفحة يوميًا (من ٦٠٤ صفحات في مصحف المدينة).
        </p>
      )}
      <Button type="submit" disabled={!valid}>
        إنشاء الخطة
      </Button>
    </form>
  );
}

function ActiveKhatma({ k }: { k: Khatma }) {
  const toast = useToast();
  const readingLog = useStore((s) => s.readingLog);
  const p = useMemo(() => khatmaProgress(k, { readingLog }), [k, readingLog]);
  const [confirm, setConfirm] = useState(false);
  const [editDays, setEditDays] = useState<string | null>(null);
  const next = p.next ? getSurahMeta(p.next.surah) : null;
  const behind = p.pagesRead + 0.5 < p.expectedPages;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{k.title}</p>
          <p className="text-xs text-muted">
            من {formatShortDate(k.startDate)} إلى {formatShortDate(p.endDate)} · {toArabicDigits(k.days)} يومًا
          </p>
        </div>
        <Badge tone={k.status === "paused" ? "neutral" : "accent"}>{k.status === "paused" ? "متوقفة مؤقتًا" : "نشطة"}</Badge>
      </div>
      <div>
        <div className="mb-1 flex justify-between text-sm">
          <span>
            {formatAmount(p.pagesRead)} من ٦٠٤ صفحة · {toArabicDigits(p.ayahsRead)} آية
          </span>
          <span className="font-bold tabular-nums">{formatAmount(Math.floor(p.percent * 10) / 10)}٪</span>
        </div>
        <ProgressBar value={p.percent / 100} label="تقدم الختمة" />
      </div>
      {p.complete ? (
        <p className="rounded-xl bg-accent-soft p-3 font-semibold text-success">أتممتَ الختمة. تقبّل الله منك وجعله حجة لك.</p>
      ) : k.status === "active" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-surface-2 p-3">
            <p className="text-xs text-muted">المقترح لليوم</p>
            <p className="text-lg font-bold">
              {formatAmount(Math.max(0, p.dailyPages - p.readToday))} صفحة
              {p.readToday > 0 && <span className="text-sm font-semibold text-muted"> (قرأت {formatAmount(p.readToday)})</span>}
            </p>
            <p className="text-xs text-muted">{behind ? "لا بأس، المقدار يتوزّع على الأيام المتبقية" : "أنت على المسار"}</p>
          </div>
          {next && p.next && (
            <div className="rounded-xl bg-surface-2 p-3">
              <p className="text-xs text-muted">أول موضع لم تقرأه بعد</p>
              <p className="text-lg font-bold">
                {next.name} {toArabicDigits(p.next.ayah)}
              </p>
              <ButtonLink href={`/quran/${p.next.surah}?ayah=${p.next.ayah}`} size="sm" className="mt-1">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                اقرأ من هنا
              </ButtonLink>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted">الخطة متوقفة. لن تُحسب عليك أهداف يومية حتى تستأنفها.</p>
      )}

      {editDays !== null ? (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(editDays);
            if (!Number.isInteger(n) || n < 1 || n > 3650) return;
            updateKhatma(k.id, { days: n });
            setEditDays(null);
            toast("عُدّلت مدة الخطة");
          }}
        >
          <Field label="المدة الجديدة بالأيام">
            {(id) => <Input id={id} type="number" min={1} max={3650} value={editDays} onChange={(e) => setEditDays(e.target.value)} className="w-32" />}
          </Field>
          <Button type="submit" size="sm">
            حفظ
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditDays(null)}>
            إلغاء
          </Button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditDays(String(k.days))}>
            تعديل المدة
          </Button>
          {k.status === "active" ? (
            <Button size="sm" variant="outline" onClick={() => updateKhatma(k.id, { status: "paused" })}>
              <Pause className="h-4 w-4" aria-hidden="true" />
              إيقاف مؤقت
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => updateKhatma(k.id, { status: "active" })}>
              <Play className="h-4 w-4" aria-hidden="true" />
              استئناف
            </Button>
          )}
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            حذف
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        danger
        title="حذف خطة الختمة"
        message="ستُحذف الخطة فقط، ويبقى سجل قراءتك محفوظًا. هل تريد المتابعة؟"
        confirmLabel="حذف الخطة"
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          deleteKhatma(k.id);
          toast("حُذفت الخطة");
        }}
      />
    </div>
  );
}

export function KhatmaCard() {
  const khatmas = useStore((s) => s.khatmas);
  const [creating, setCreating] = useState(false);
  const current = useMemo(
    () =>
      Object.values(khatmas)
        .filter((k) => !k.deleted && k.status !== "done")
        .sort((a, b) => (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || b.updatedAt.localeCompare(a.updatedAt))[0],
    [khatmas],
  );
  return (
    <Card>
      <CardTitle
        icon={<BookOpen className="h-5 w-5" />}
        action={
          current && !creating ? (
            <button type="button" onClick={() => setCreating(true)} className="text-sm font-semibold text-accent focus-ring rounded">
              خطة جديدة
            </button>
          ) : null
        }
      >
        خطة الختمة
      </CardTitle>
      {current && !creating ? (
        <ActiveKhatma k={current} />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">
            خطة اختيارية لمن أراد ختم القرآن خلال مدة محددة. تُحسب من صفحات المصحف الفعلية ومن الآيات التي قرأتها في القارئ.
          </p>
          <NewKhatmaForm onDone={() => setCreating(false)} />
          {creating && (
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setCreating(false)}>
              إلغاء
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
