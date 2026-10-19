"use client";

import { Check, Compass, Minus, Plus, Settings2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge, Card, CardTitle } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Segmented, Select } from "@/components/ui/Form";
import { cn } from "@/components/ui/cn";
import { dayKey } from "@/lib/date";
import { setDevice, useDevice, type PrayerKey } from "@/lib/device";
import { FARD, formatTime, METHODS, nextPrayer, PRAYER_NAMES, PRAYER_ORDER } from "@/lib/prayer";
import { markPrayer } from "@/lib/store/actions";
import { useHydrated, useStore } from "@/lib/store/store";
import { PRAYER_ICONS, PRAYER_TINTS } from "./icons";
import { LocationPicker } from "./LocationPicker";
import { PrayerHero } from "./PrayerHero";
import { useNow } from "./useNow";

export function PrayerView() {
  const hydrated = useHydrated();
  const device = useDevice((s) => s);
  const now = useNow(30_000);
  const [locOpen, setLocOpen] = useState(false);
  const today = dayKey();
  const log = useStore((s) => s.prayerLog[today]);
  const np = useMemo(() => (now ? nextPrayer(device, now) : null), [device, now]);
  const tz = device.location?.tz;

  if (!hydrated) return <div className="h-96 animate-pulse rounded-[1.75rem] bg-surface-2" />;

  if (!device.location) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <PrayerHero />
        <Card>
          <CardTitle>حدد موقعك</CardTitle>
          <LocationPicker />
        </Card>
      </div>
    );
  }

  const doneCount = FARD.filter((k) => log?.[k]?.done).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PrayerHero />

      <Card className="card-soft border-transparent">
        <CardTitle
          action={
            <span className="text-xs text-muted" aria-live="polite">
              صليتُ {doneCount} من ٥ <span className="sr-only">صلوات اليوم</span>
            </span>
          }
        >
          مواقيت اليوم
        </CardTitle>
        <ul className="space-y-2">
          {np?.today.map((p) => {
            const Icon = PRAYER_ICONS[p.key];
            const isNext = np.next.key === p.key && np.next.time.toDateString() === p.time.toDateString();
            const fard = p.key !== "sunrise";
            const done = !!log?.[p.key]?.done;
            return (
              <li
                key={p.key}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                  isNext ? "bg-primary text-primary-fg" : "bg-surface-2",
                )}
              >
                <span className={cn("grid h-10 w-10 place-items-center rounded-xl", isNext ? "bg-white/15" : PRAYER_TINTS[p.key])}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="flex-1 font-bold">
                  {p.name}
                  {isNext && <span className="mr-2 text-xs font-semibold opacity-80">القادمة</span>}
                </span>
                <span className="font-semibold tabular-nums">{formatTime(p.time, tz)}</span>
                {fard ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={`صليتُ ${p.name}`}
                    onClick={() => markPrayer(p.key, !done)}
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-full border-2 focus-ring",
                      done ? "border-success bg-success text-white" : isNext ? "border-white/50 text-transparent" : "border-line text-transparent",
                    )}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <span className="w-8" />
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-muted">
          علامة «صليتُ» اختيارية لمتابعتك الخاصة فقط. المواقيت محسوبة فلكيًا بطريقة «{METHODS.find((m) => m.id === device.method)?.label}»؛ عند الاختلاف اعتمد تقويم بلدك أو مسجدك، ويمكنك ضبط الدقائق من الإعدادات.
        </p>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Link href="/qibla" className="card-soft flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 hover:ring-2 hover:ring-accent focus-ring">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-tint-sand text-gold-fg">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-bold">اتجاه القبلة</span>
            <span className="block text-sm text-muted">بوصلة من موقعك الحالي</span>
          </span>
        </Link>
        <button type="button" onClick={() => setLocOpen(true)} className="card-soft flex items-center gap-4 rounded-[var(--radius-card)] bg-surface p-5 text-right hover:ring-2 hover:ring-accent focus-ring">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-tint-sage text-accent">
            <Settings2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block font-bold">تغيير الموقع</span>
            <span className="block text-sm text-muted">{device.location.label}</span>
          </span>
        </button>
      </div>

      <Card>
        <CardTitle icon={<Settings2 className="h-5 w-5" />}>إعدادات الحساب</CardTitle>
        <div className="space-y-4">
          <div>
            <label htmlFor="method" className="mb-1.5 block text-sm font-semibold">
              طريقة الحساب
            </label>
            <Select id="method" value={device.method} onChange={(e) => setDevice({ method: e.target.value as typeof device.method })}>
              {METHODS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">حساب العصر</p>
            <Segmented
              label="حساب العصر"
              value={device.madhab}
              onChange={(madhab) => setDevice({ madhab })}
              options={[
                { value: "shafi", label: "الجمهور" },
                { value: "hanafi", label: "الحنفي" },
              ]}
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">تعديل يدوي بالدقائق (لمطابقة مسجدك)</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRAYER_ORDER.map((k: PrayerKey) => (
                <li key={k} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2">
                  <span className="text-sm font-semibold">{PRAYER_NAMES[k]}</span>
                  <span className="flex items-center gap-1">
                    <button type="button" aria-label={`تقديم ${PRAYER_NAMES[k]} دقيقة`} onClick={() => setDevice({ adjust: { ...device.adjust, [k]: device.adjust[k] - 1 } })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface focus-ring">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums" dir="ltr">
                      {device.adjust[k] > 0 ? `+${device.adjust[k]}` : device.adjust[k]}
                    </span>
                    <button type="button" aria-label={`تأخير ${PRAYER_NAMES[k]} دقيقة`} onClick={() => setDevice({ adjust: { ...device.adjust, [k]: device.adjust[k] + 1 } })} className="grid h-7 w-7 place-items-center rounded-full hover:bg-surface focus-ring">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <Badge tone="accent">كل الحسابات تتم على جهازك، وتعمل دون اتصال</Badge>
        </div>
      </Card>

      <Dialog open={locOpen} onClose={() => setLocOpen(false)} title="تغيير الموقع">
        <LocationPicker onDone={() => setLocOpen(false)} />
      </Dialog>
    </div>
  );
}
