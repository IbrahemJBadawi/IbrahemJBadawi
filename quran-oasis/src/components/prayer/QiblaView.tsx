"use client";

import { Compass, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import { useDevice } from "@/lib/device";
import { distanceToKaaba, qiblaBearing } from "@/lib/prayer";
import { useHydrated } from "@/lib/store/store";
import { LocationPicker } from "./LocationPicker";

type SensorState = "idle" | "active" | "unsupported" | "denied";

interface OrientationEventIOS extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

/** بوصلة القبلة: تدور مع اتجاه الهاتف إن توفر مستشعر البوصلة، وإلا تُعرض الزاوية من الشمال. */
export function QiblaView() {
  const hydrated = useHydrated();
  const loc = useDevice((s) => s.location);
  const [heading, setHeading] = useState<number | null>(null);
  const [sensor, setSensor] = useState<SensorState>("idle");

  const onOrient = useCallback((e: Event) => {
    const ev = e as OrientationEventIOS;
    let h: number | null = null;
    if (typeof ev.webkitCompassHeading === "number") h = ev.webkitCompassHeading;
    else if (ev.absolute && typeof ev.alpha === "number") h = 360 - ev.alpha;
    if (h !== null) {
      setHeading(((h % 360) + 360) % 360);
      setSensor("active");
    }
  }, []);

  useEffect(
    () => () => {
      window.removeEventListener("deviceorientationabsolute", onOrient);
      window.removeEventListener("deviceorientation", onOrient);
    },
    [onOrient],
  );

  const start = async () => {
    if (typeof DeviceOrientationEvent === "undefined") return setSensor("unsupported");
    const D = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
    if (typeof D.requestPermission === "function") {
      try {
        if ((await D.requestPermission()) !== "granted") return setSensor("denied");
      } catch {
        return setSensor("denied");
      }
    }
    window.addEventListener("deviceorientationabsolute", onOrient);
    window.addEventListener("deviceorientation", onOrient);
    setTimeout(() => setSensor((s) => (s === "active" ? s : "unsupported")), 2500);
  };

  if (!hydrated) return <div className="h-96 animate-pulse rounded-[1.75rem] bg-surface-2" />;
  if (!loc) {
    return (
      <Card className="mx-auto max-w-xl">
        <p className="mb-4 text-muted">حدد موقعك لمعرفة اتجاه القبلة.</p>
        <LocationPicker />
      </Card>
    );
  }

  const bearing = qiblaBearing(loc.lat, loc.lon);
  const km = distanceToKaaba(loc.lat, loc.lon);
  const dialRotation = heading !== null ? -heading : 0;
  const diff = heading !== null ? Math.abs(((bearing - heading + 540) % 360) - 180) : null;
  const aligned = diff !== null && diff < 5;

  return (
    <div className="mx-auto max-w-md space-y-5 text-center">
      <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-sm font-semibold">
        <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
        {loc.label}
      </p>

      <div className="hero-sunrise card-soft relative mx-auto grid aspect-square w-full max-w-[22rem] place-items-center rounded-full">
        <div
          className="relative h-[86%] w-[86%] overflow-hidden rounded-full border-2 border-gold/50 bg-surface transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${dialRotation}deg)` }}
          role="img"
          aria-label={`القبلة على زاوية ${Math.round(bearing)} درجة من الشمال`}
        >
          <span className="absolute left-1/2 top-5 -translate-x-1/2 text-sm font-bold text-danger">ش</span>
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">ق</span>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 text-sm font-bold text-muted">ج</span>
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">غ</span>
          {Array.from({ length: 36 }, (_, i) => (
            <span key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 10}deg)` }} aria-hidden="true">
              <span className={cn("absolute left-1/2 top-1 w-px -translate-x-1/2 bg-line", i % 9 === 0 ? "h-3 bg-muted" : "h-2")} />
            </span>
          ))}
          {/* الإبرة نحو القبلة */}
          <div className="absolute inset-0" style={{ transform: `rotate(${bearing}deg)` }}>
            <div className="absolute left-1/2 top-[9%] flex -translate-x-1/2 flex-col items-center">
              <span className={cn("grid h-11 w-11 place-items-center rounded-xl text-lg shadow", aligned ? "bg-success" : "bg-deep")} aria-hidden="true">
                <span className="block h-5 w-5 rounded-[3px] border-t-4 border-gold bg-black" />
              </span>
              <span className={cn("mt-1 h-24 w-1.5 rounded-full", aligned ? "bg-success" : "bg-gold")} />
            </div>
          </div>
          <span className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-deep ring-4 ring-gold/40" />
        </div>
      </div>

      <div>
        <p className="text-4xl font-bold tabular-nums">{Math.round(bearing)}°</p>
        <p className="text-sm text-muted">زاوية القبلة من الشمال الجغرافي (باتجاه عقارب الساعة)</p>
        <p className="mt-1 text-sm text-muted">المسافة إلى الكعبة المشرفة: {new Intl.NumberFormat("ar").format(Math.round(km))} كم</p>
      </div>

      {sensor === "active" ? (
        <p role="status" className={cn("rounded-2xl p-3 text-sm font-semibold", aligned ? "bg-accent-soft text-success" : "bg-surface-2")}>
          {aligned ? "أنت متجه نحو القبلة" : "أدر الهاتف حتى تصبح الإبرة في الأعلى وتتحول إلى الأخضر"}
        </p>
      ) : (
        <div className="space-y-2">
          <Button onClick={start} variant="gold">
            <Compass className="h-5 w-5" aria-hidden="true" />
            تفعيل البوصلة
          </Button>
          {sensor === "unsupported" && <p className="text-sm text-muted">لا تتوفر بوصلة في هذا الجهاز أو المتصفح. وجّه أعلى الشاشة نحو الشمال لتقرأ الاتجاه من الرسم.</p>}
          {sensor === "denied" && <p className="text-sm text-muted">لم يُسمح بالوصول إلى مستشعر الاتجاه.</p>}
        </div>
      )}
      <p className="text-xs text-muted">دقة البوصلة تتأثر بالمعادن والمغناطيس القريبة؛ حرّك الهاتف على شكل رقم ٨ لمعايرتها.</p>
    </div>
  );
}
