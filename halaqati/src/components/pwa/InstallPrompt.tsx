"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { promptInstall, useInstallState } from "./install-store";

const KEY = "halaqati-install-dismissed";

function wasDismissed() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

/** Floating "install Halaqati" card on public pages (native prompt where supported; iOS gets instructions). */
export function InstallPrompt() {
  const state = useInstallState();
  const [hidden, setHidden] = useState(false);
  const [dismissed] = useState(() => (typeof window === "undefined" ? true : wasDismissed()));

  if (hidden || dismissed || state === "installed" || state === "manual") return null;
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, "1"); } catch {} };
  return (
    <div role="dialog" aria-label="تثبيت حلقتي" className="surface fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center gap-3 p-3 shadow-lg print:hidden">
      <Image src="/brand/halaqati-mark-128.png" alt="" width={44} height={44} unoptimized className="rounded-lg" />
      <div className="flex-1 text-sm">
        <p className="font-bold text-ink">ثبّت حلقتي على هاتفك</p>
        <p className="text-muted">{state === "ios" ? "من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»" : "مجانًا، وأخف من التطبيقات العادية"}</p>
      </div>
      {state === "ready" ? (
        <button className="btn btn-primary" onClick={async () => { await promptInstall(); dismiss(); }}>تثبيت</button>
      ) : (
        <Link href="/app" className="btn btn-primary">الطريقة</Link>
      )}
      <button onClick={dismiss} aria-label="إغلاق" className="icon-button">✕</button>
    </div>
  );
}
