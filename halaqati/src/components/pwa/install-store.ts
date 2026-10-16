"use client";

import { useSyncExternalStore } from "react";

/** The browser's deferred install prompt, shared by every install button. */
type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: BIP | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e as BIP; emit(); });
  window.addEventListener("appinstalled", () => { installed = true; deferred = null; emit(); });
}

export type InstallState = "installed" | "ready" | "ios" | "manual";

function snapshot(): InstallState {
  if (installed || window.matchMedia("(display-mode: standalone)").matches) return "installed";
  if (deferred) return "ready";
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return "ios";
  return "manual";
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    snapshot,
    () => "manual",
  );
}

/** Shows the native prompt. Returns true when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const e = deferred;
  await e.prompt();
  const { outcome } = await e.userChoice;
  deferred = null;
  emit();
  return outcome === "accepted";
}
