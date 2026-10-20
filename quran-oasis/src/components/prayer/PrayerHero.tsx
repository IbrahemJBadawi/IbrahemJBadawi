"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { MosqueSilhouette } from "@/components/MosqueSilhouette";
import { cn } from "@/components/ui/cn";
import { formatHijri } from "@/lib/date";
import { useDevice } from "@/lib/device";
import { formatCountdown, formatTime, nextPrayer } from "@/lib/prayer";
import { useNow } from "./useNow";

/** بطاقة البطل: الصلاة القادمة والعدّ التنازلي، مع التاريخين. تُحسب محليًا بالكامل. */
export function PrayerHero({ className, children }: { className?: string; children?: React.ReactNode }) {
  const now = useNow(1000);
  const device = useDevice((s) => s);
  const np = useMemo(() => (now ? nextPrayer(device, now) : null), [device, now]);
  const tz = device.location?.tz;
  const hijri = now ? formatHijri(now) : null;

  return (
    <section className={cn("hero-gradient relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6", className)} aria-label="الصلاة القادمة">
      <MosqueSilhouette className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full opacity-[0.13] sm:h-28" color="#F8F6EF" />
      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ivory/80">
          <span className="min-h-5">
            {now && new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long" }).format(now)}
            {hijri && ` · ${hijri}`}
          </span>
          {device.location && (
            <Link href="/prayer" className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold hover:bg-white/20 focus-ring">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {device.location.label}
            </Link>
          )}
        </div>

        {device.location ? (
          np ? (
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-ivory/75">الصلاة القادمة</p>
                <p className="text-3xl font-bold leading-tight">
                  {np.next.name} <span className="text-gold">{formatTime(np.next.time, tz)}</span>
                </p>
              </div>
              <div className="text-left">
                <p className="text-xs text-ivory/70">متبقٍ</p>
                <p className="font-mono text-3xl font-bold tabular-nums tracking-wide" dir="ltr" aria-live="off">
                  {formatCountdown(np.remainingMs)}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 h-16" />
          )
        ) : (
          <div className="mt-4">
            <p className="text-2xl font-bold">مواقيت الصلاة والقبلة</p>
            <p className="mt-1 text-sm text-ivory/75">تُحسب على جهازك دون إنترنت بعد تحديد مدينتك.</p>
            <Link href="/prayer" className="mt-3 inline-flex h-10 items-center rounded-full bg-gold px-5 text-sm font-bold text-deep focus-ring">
              حدد موقعك
            </Link>
          </div>
        )}
        {children && <div className="relative mt-5">{children}</div>}
      </div>
    </section>
  );
}
