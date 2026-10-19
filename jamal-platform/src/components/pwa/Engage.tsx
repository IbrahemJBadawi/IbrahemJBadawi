"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Check, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InstallApp, useCanPromptInstall, usePlatform } from "./InstallApp";
import { disablePush, enablePush, isSubscribed, pushSupport, type PushSupport } from "./push";

const DISMISS_KEY = "jamal_engage_dismissed_at";
const WEEK = 7 * 24 * 60 * 60 * 1000;

function usePushSupport(): PushSupport | "server" {
  return useSyncExternalStore(() => () => undefined, () => pushSupport(), () => "server");
}

function recentlyDismissed() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < WEEK;
  } catch {
    return false;
  }
}

/**
 * Bottom sheet asking to turn on notifications and install the app.
 * Appears a few seconds into a visit, at most once a week if dismissed,
 * and only when there is something to offer on this device.
 */
export function EngagePrompt({ signedIn }: { signedIn: boolean }) {
  const platform = usePlatform();
  const canInstall = useCanPromptInstall();
  const push = usePushSupport();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const offerPush = signedIn && push === "default";
  const offerInstall = platform !== "installed" && platform !== "server" && (canInstall || platform === "ios");

  useEffect(() => {
    if (!(offerPush || offerInstall) || recentlyDismissed()) return;
    const t = setTimeout(() => setOpen(true), 6000);
    return () => clearTimeout(t);
  }, [offerPush, offerInstall]);

  if (!open) return null;
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* storage unavailable */ }
  };

  return (
    <div role="dialog" aria-modal="false" aria-labelledby="engage-title" className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 rounded-[1.75rem] border border-line bg-paper p-5 shadow-[0_24px_48px_-20px_rgba(29,27,24,0.45)] md:inset-x-auto md:bottom-6 md:end-6 md:w-96 print:hidden">
      <button type="button" onClick={close} aria-label="إغلاق" className="absolute top-3 end-3 inline-flex size-8 items-center justify-center rounded-full hover:bg-sand">
        <X className="size-4" />
      </button>
      <p id="engage-title" className="text-base font-bold">خلّيك على اطلاع بطلباتك</p>
      <p className="mt-1 text-xs leading-6 text-muted">نرسل لك تنبيهًا عند اعتماد السعر، وتأكيد الدفع، والشحن، والتسليم.</p>
      <ul className="mt-4 space-y-3">
        {(offerPush || (signedIn && push === "needs-install")) && (
          <li className="flex items-center gap-3 rounded-2xl bg-ivory p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-ivory"><Bell className="size-4" /></span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">الإشعارات</p>
              {push === "needs-install" ? (
                <p className="text-xs leading-5 text-muted">على آيفون: ثبّت التطبيق أولًا ثم فعّل الإشعارات من داخله.</p>
              ) : state === "done" ? (
                <p className="inline-flex items-center gap-1 text-xs text-success"><Check className="size-3.5" /> تم التفعيل</p>
              ) : (
                <p className="text-xs leading-5 text-muted">{message ?? "تصلك على هذا الجهاز حتى لو كان الموقع مغلقًا."}</p>
              )}
            </div>
            {offerPush && state !== "done" && (
              <Button
                size="sm"
                type="button"
                disabled={state === "busy"}
                onClick={async () => {
                  setState("busy");
                  const r = await enablePush();
                  setState(r.ok ? "done" : "error");
                  setMessage(r.error ?? null);
                }}
              >
                تفعيل
              </Button>
            )}
          </li>
        )}
        {!signedIn && (
          <li className="flex items-center gap-3 rounded-2xl bg-ivory p-3 text-xs leading-5 text-muted">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sand text-ink"><Bell className="size-4" /></span>
            <span>
              <Link href="/login" className="font-semibold text-ink underline underline-offset-2">سجّل الدخول</Link> لتصلك الإشعارات، أو فعّلها من صفحة طلبك بعد الطلب.
            </span>
          </li>
        )}
        {offerInstall && (
          <li className="flex items-center gap-3 rounded-2xl bg-ivory p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-ivory"><Smartphone className="size-4" /></span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">تطبيق منصة الجمال</p>
              {platform === "ios" ? <InstallApp compact /> : <p className="text-xs leading-5 text-muted">أسرع، ويفتح من الشاشة الرئيسية.</p>}
            </div>
            {platform !== "ios" && <InstallApp compact />}
          </li>
        )}
      </ul>
      <button type="button" onClick={close} className="mt-4 w-full text-center text-xs font-semibold text-muted hover:text-ink">لاحقًا</button>
    </div>
  );
}

/** On/off switch for this device (account notifications pages). */
export function PushToggle() {
  const push = usePushSupport();
  const [on, setOn] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    isSubscribed().then((v) => alive && setOn(v)).catch(() => alive && setOn(false));
    return () => {
      alive = false;
    };
  }, [push]);

  if (push === "server") return null;
  if (push === "unsupported") return <p className="text-sm text-muted">هذا المتصفح لا يدعم الإشعارات.</p>;
  if (push === "needs-install") return <p className="text-sm text-muted">على آيفون: ثبّت التطبيق من زر المشاركة ← «إضافة إلى الشاشة الرئيسية» ثم افتحه وفعّل الإشعارات من هنا.</p>;
  if (push === "denied") return <p className="text-sm text-muted">الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح ثم عد إلى هنا.</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant={on ? "outline" : "primary"}
        disabled={busy || on === null}
        onClick={async () => {
          setBusy(true);
          setError(null);
          if (on) {
            await disablePush();
            setOn(false);
          } else {
            const r = await enablePush();
            setOn(r.ok);
            setError(r.error ?? null);
          }
          setBusy(false);
        }}
      >
        {on ? <BellOff className="size-4" /> : <Bell className="size-4" />}
        {on ? "إيقاف الإشعارات على هذا الجهاز" : "تفعيل الإشعارات على هذا الجهاز"}
      </Button>
      {on && <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="size-3.5" /> مفعّلة</span>}
      {error && <p className="w-full text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

/** Guests follow one order from its private page. */
export function OrderPushCard({ number, token, signedIn }: { number: string; token: string | null; signedIn: boolean }) {
  const push = usePushSupport();
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  if (push === "server" || push === "unsupported" || push === "denied") return null;
  if (!signedIn && !token) return null;
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-line bg-paper p-4 print:hidden">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-ivory"><Bell className="size-4" /></span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">تابع طلبك بالإشعارات</p>
        <p className="text-xs leading-5 text-muted">
          {push === "needs-install" ? "على آيفون: ثبّت التطبيق أولًا ثم افتح هذه الصفحة منه." : state === "done" ? "تم التفعيل. سنرسل لك كل تحديث." : error ?? "نرسل تنبيهًا عند كل تحديث على هذا الطلب."}
        </p>
      </div>
      {push !== "needs-install" && state !== "done" && (
        <Button
          type="button"
          size="sm"
          disabled={state === "busy"}
          onClick={async () => {
            setState("busy");
            const r = await enablePush(token ? { number, token } : undefined);
            setError(r.error ?? null);
            setState(r.ok ? "done" : "idle");
          }}
        >
          تفعيل
        </Button>
      )}
    </div>
  );
}
