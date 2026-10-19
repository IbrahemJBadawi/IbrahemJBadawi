"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let deferred: BIPEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function usePlatform() {
  return useSyncExternalStore(
    () => () => undefined,
    () => {
      const ua = navigator.userAgent;
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      return standalone ? "installed" : /iphone|ipad|ipod/i.test(ua) ? "ios" : "other";
    },
    () => "server",
  );
}

/** Install button (Android/Chrome) or Add-to-Home-Screen steps (iOS Safari). */
export function InstallApp({ compact = false }: { compact?: boolean }) {
  const platform = usePlatform();
  const canPrompt = useSyncExternalStore(subscribe, () => !!deferred, () => false);
  if (platform === "server") return null;
  if (platform === "installed") return compact ? null : <p className="text-sm text-success">التطبيق مثبّت على جهازك.</p>;
  if (platform === "ios") {
    return (
      <p className="flex flex-wrap items-center gap-1 text-sm leading-7 text-ink-soft">
        على آيفون: اضغط زر المشاركة <Share className="inline size-4" aria-label="مشاركة" /> في Safari ثم «إضافة إلى الشاشة الرئيسية».
      </p>
    );
  }
  if (!canPrompt) {
    return compact ? null : <p className="text-sm leading-7 text-muted">افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية». يتطلب الموقع منشورًا عبر HTTPS.</p>;
  }
  return (
    <Button
      type="button"
      size={compact ? "sm" : "md"}
      onClick={async () => {
        const e = deferred;
        if (!e) return;
        await e.prompt();
        await e.userChoice;
        deferred = null;
        listeners.forEach((l) => l());
      }}
    >
      <Download className="size-4" /> تثبيت التطبيق
    </Button>
  );
}

/** One-time dismissible banner on phones (shown only when installing is possible). */
export function InstallBanner() {
  const canPrompt = useSyncExternalStore(subscribe, () => !!deferred, () => false);
  const platform = usePlatform();
  const stored = useSyncExternalStore(
    () => () => undefined,
    () => {
      try {
        return localStorage.getItem("jamal_install_dismissed") === "1";
      } catch {
        return false;
      }
    },
    () => true,
  );
  const [dismissed, setDismissed] = useState(false);
  if (stored || dismissed || platform === "installed" || platform === "server" || (!canPrompt && platform !== "ios")) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 rounded-2xl border border-line bg-paper p-3 shadow-lg md:hidden print:hidden" role="region" aria-label="تثبيت التطبيق">
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold">ثبّت تطبيق منصة الجمال</p>
        <InstallApp compact />
      </div>
      <button
        type="button"
        aria-label="إخفاء"
        className="inline-flex size-8 items-center justify-center rounded-full hover:bg-sand"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem("jamal_install_dismissed", "1");
          } catch { /* storage unavailable */ }
        }}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
