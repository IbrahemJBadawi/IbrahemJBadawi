"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "halaqati-install-dismissed";

/** Floating "install Halaqati" card on public pages (Android/Chrome native prompt; iOS gets instructions). */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIP | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(KEY) === "1"; } catch {}
    if (dismissed || window.matchMedia("(display-mode: standalone)").matches) return;
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BIP); setVisible(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      const t = setTimeout(() => { setIos(true); setVisible(true); }, 0);
      return () => { clearTimeout(t); window.removeEventListener("beforeinstallprompt", onPrompt); };
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;
  const dismiss = () => { setVisible(false); try { localStorage.setItem(KEY, "1"); } catch {} };
  return (
    <div role="dialog" aria-label="تثبيت حلقتي" className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg print:hidden">
      <Image src="/brand/halaqati-mark-128.png" alt="" width={44} height={44} unoptimized className="rounded-lg" />
      <div className="flex-1 text-sm">
        <p className="font-bold text-brand-900">ثبّت حلقتي على هاتفك</p>
        <p className="text-muted">{ios ? "من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»" : "مجانًا، وأخف من التطبيقات العادية"}</p>
      </div>
      {deferred ? (
        <button className="min-h-11 rounded-lg bg-brand-800 px-3 font-semibold text-white" onClick={async () => { await deferred.prompt(); await deferred.userChoice; dismiss(); }}>تثبيت</button>
      ) : (
        <Link href="/app" className="min-h-11 rounded-lg bg-brand-800 px-3 py-2.5 font-semibold text-white">الطريقة</Link>
      )}
      <button onClick={dismiss} aria-label="إغلاق" className="min-h-11 px-2 text-muted">✕</button>
    </div>
  );
}
