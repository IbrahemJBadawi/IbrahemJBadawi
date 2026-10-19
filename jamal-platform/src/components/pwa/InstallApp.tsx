"use client";

import { useSyncExternalStore } from "react";
import { Download, Share } from "lucide-react";
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
export const subscribeInstall = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function usePlatform() {
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
  const canPrompt = useSyncExternalStore(subscribeInstall, () => !!deferred, () => false);
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

export function useCanPromptInstall() {
  return useSyncExternalStore(subscribeInstall, () => !!deferred, () => false);
}
