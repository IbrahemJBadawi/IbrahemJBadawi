"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Form";
import { useToast } from "@/components/ui/Toast";
import { setDevice } from "@/lib/device";
import { CITIES, suggestMethod } from "@/lib/prayer";
import { normalizeArabic } from "@/lib/quran";

/** اختيار الموقع: GPS (بإذن صريح) أو مدينة من القائمة. يُحفظ على الجهاز فقط. */
export function LocationPicker({ onDone }: { onDone?: () => void }) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useMemo(() => {
    const n = normalizeArabic(q);
    return n ? CITIES.filter((c) => normalizeArabic(`${c.label} ${c.country}`).includes(n)) : CITIES;
  }, [q]);

  const useGps = () => {
    setError(null);
    if (!("geolocation" in navigator)) return setError("تحديد الموقع غير مدعوم في هذا المتصفح. اختر مدينتك من القائمة.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setDevice({
          location: { lat: pos.coords.latitude, lon: pos.coords.longitude, label: "موقعي الحالي", tz, source: "gps" },
          method: suggestMethod(tz),
        });
        toast("حُدّد موقعك، وحُفظ على هذا الجهاز فقط");
        onDone?.();
      },
      (err) => {
        setBusy(false);
        setError(err.code === err.PERMISSION_DENIED ? "لم يُسمح بالوصول إلى الموقع. يمكنك اختيار مدينتك من القائمة." : "تعذّر تحديد الموقع. اختر مدينتك من القائمة.");
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 3_600_000 },
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-2 p-4">
        <p className="text-sm text-muted">
          نستخدم موقعك لحساب مواقيت الصلاة واتجاه القبلة <strong className="text-fg">على جهازك فقط</strong> — لا يُرسل إلى أي خادم، ويُقرّب إلى نحو كيلومتر واحد.
        </p>
        <Button className="mt-3" onClick={useGps} disabled={busy}>
          <LocateFixed className="h-5 w-5" aria-hidden="true" />
          {busy ? "جارٍ التحديد…" : "استخدام موقعي الحالي"}
        </Button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="city-q" className="mb-1.5 block text-sm font-semibold">
          أو اختر مدينتك
        </label>
        <Input id="city-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث: الرياض، القاهرة، عمّان…" />
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-line" aria-label="المدن">
          {list.map((c) => (
            <li key={`${c.label}-${c.country}`}>
              <button
                type="button"
                onClick={() => {
                  setDevice({ location: { lat: c.lat, lon: c.lon, label: c.label, tz: c.tz, source: "city" }, method: c.method });
                  toast(`اخترت ${c.label}`);
                  onDone?.();
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-right hover:bg-surface-2 focus-ring"
              >
                <MapPin className="h-4 w-4 text-accent" aria-hidden="true" />
                <span className="font-semibold">{c.label}</span>
                <span className="text-sm text-muted">{c.country}</span>
              </button>
            </li>
          ))}
          {!list.length && <li className="px-4 py-3 text-sm text-muted">لا توجد نتيجة. جرّب «استخدام موقعي الحالي».</li>}
        </ul>
      </div>
    </div>
  );
}
