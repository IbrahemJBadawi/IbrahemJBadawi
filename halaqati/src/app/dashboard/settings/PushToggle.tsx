"use client";

import { useEffect, useState } from "react";
import { getVapidKeyAction, removePushSubscriptionAction, savePushSubscriptionAction } from "@/app/dashboard/motivation-actions";
import { Icon } from "@/components/Icon";
import { Alert, Button } from "@/components/ui";

type Status = "checking" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
}

async function detect(): Promise<Status> {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return ios && !standalone ? "ios-install" : "unsupported";
  }
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

/** Turns real Web Push on/off for this device (stored per device in the database). */
export function PushToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    detect().then((s) => { if (alive) setStatus(s); }).catch(() => { if (alive) setStatus("unsupported"); });
    return () => { alive = false; };
  }, []);

  async function enable() {
    setBusy(true); setMsg(null);
    try {
      const key = await getVapidKeyAction();
      if (!key) { setMsg({ tone: "error", text: "إشعارات الجهاز غير مهيّأة على الخادم بعد." }); return; }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setStatus(permission === "denied" ? "denied" : "off"); return; }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) }));
      const json = sub.toJSON();
      const res = await savePushSubscriptionAction({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "", userAgent: navigator.userAgent });
      if (!res.ok) { await sub.unsubscribe(); setMsg({ tone: "error", text: res.error ?? "تعذّر التفعيل" }); return; }
      setStatus("on");
      setMsg({ tone: "success", text: res.message ?? "فُعّلت الإشعارات" });
    } catch {
      setMsg({ tone: "error", text: "تعذّر تفعيل الإشعارات على هذا المتصفح." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true); setMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscriptionAction(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
      setMsg({ tone: "success", text: "أُوقفت الإشعارات على هذا الجهاز" });
    } catch {
      setMsg({ tone: "error", text: "تعذّر الإيقاف، حاول مرة أخرى." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "checking" && <p className="text-muted">جارٍ فحص دعم المتصفح…</p>}
      {status === "unsupported" && <Alert tone="warning">هذا المتصفح لا يدعم إشعارات الويب. جرّب Chrome أو Edge أو Safari الحديث.</Alert>}
      {status === "ios-install" && <Alert tone="info">على iPhone: ثبّت حلقتي أولًا (زر المشاركة ← «إضافة إلى الشاشة الرئيسية»)، ثم افتحه من الشاشة الرئيسية وفعّل الإشعارات من هنا.</Alert>}
      {status === "denied" && <Alert tone="warning">الإشعارات محظورة لهذا الموقع. اسمح بها من إعدادات المتصفح (رمز القفل بجوار العنوان) ثم أعد تحميل الصفحة.</Alert>}
      {status === "off" && (
        <Button type="button" onClick={enable} disabled={busy} aria-busy={busy}><Icon name="bell" />{busy ? "جارٍ التفعيل…" : "تفعيل الإشعارات على هذا الجهاز"}</Button>
      )}
      {status === "on" && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold text-brand-800"><Icon name="check" />الإشعارات مفعّلة على هذا الجهاز</span>
          <Button type="button" variant="secondary" onClick={disable} disabled={busy}>إيقاف</Button>
        </div>
      )}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
    </div>
  );
}
