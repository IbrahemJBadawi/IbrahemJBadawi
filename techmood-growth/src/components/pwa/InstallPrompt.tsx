"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { X } from "lucide-react";
import { promptInstall, useInstallState } from "./install-store";

const KEY = "tg-install-dismissed";

function wasDismissed() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** A dismissible "install the app" card (remembered on this device). */
export function InstallPrompt() {
  const state = useInstallState();
  const [hidden, setHidden] = useState(() => (typeof window === "undefined" ? true : wasDismissed()));
  if (hidden || state === "installed" || state === "manual") return null;
  const dismiss = () => {
    setHidden(true);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  };
  return (
    <div role="dialog" aria-label="تثبيت التطبيق" className="surface fixed inset-x-3 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 p-3 shadow-lg md:bottom-4 print:hidden">
      <Image src="/brand/icon-192.png" alt="" width={44} height={44} className="rounded-xl" />
      <div className="flex-1 text-sm">
        <p className="font-bold">ثبّت TechMood Growth على هاتفك</p>
        <p className="text-muted">{state === "ios" ? "من زر المشاركة اختر «إضافة إلى الشاشة الرئيسية»" : "افتح عملاءك ومواعيدك بلمسة واحدة"}</p>
      </div>
      {state === "ready" ? (
        <button className="btn btn-primary btn-sm" onClick={async () => { await promptInstall(); dismiss(); }}>
          تثبيت
        </button>
      ) : (
        <Link href="/install" className="btn btn-primary btn-sm">
          الطريقة
        </Link>
      )}
      <button onClick={dismiss} aria-label="إغلاق" className="icon-button">
        <X size={18} />
      </button>
    </div>
  );
}
