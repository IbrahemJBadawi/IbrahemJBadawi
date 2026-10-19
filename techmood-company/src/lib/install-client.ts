"use client";

/**
 * «Add to home screen» and the service worker — one store for the whole site
 * (the same approach as the TechMood Platform's src/lib/install-client.ts).
 *
 * Chrome and Edge fire `beforeinstallprompt` once, early; it is caught here at
 * module load and kept so every Install button can use it. iPhone never fires
 * it: Safari installs from Share → «Add to Home Screen», so the UI explains
 * the two taps instead.
 */

import { useSyncExternalStore } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallEvent | null = null;
let acceptedNow = false;
let started = false;
let listeners: (() => void)[] = [];

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}

export function startInstallCapture() {
  if (started || typeof window === "undefined") return;
  started = true;
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    acceptedNow = true;
    deferred = null;
    emit();
  });
}

function runningInstalled() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export type InstallState = { installed: boolean; canPrompt: boolean; apple: boolean };

let snapshot: InstallState | null = null;
let snapshotKey = "";
function readState(): InstallState {
  const next = {
    installed: acceptedNow || runningInstalled(),
    canPrompt: Boolean(deferred),
    apple: /iphone|ipad|ipod/i.test(navigator.userAgent),
  };
  const key = `${next.installed}|${next.canPrompt}|${next.apple}`;
  if (!snapshot || key !== snapshotKey) {
    snapshot = next;
    snapshotKey = key;
  }
  return snapshot;
}

// Nothing is known on the server: render "nothing to offer" so no button flashes.
const SERVER_STATE: InstallState = { installed: true, canPrompt: false, apple: false };

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, readState, () => SERVER_STATE);
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  if (choice.outcome === "accepted") acceptedNow = true;
  emit();
  return choice.outcome === "accepted";
}

if (typeof window !== "undefined") startInstallCapture();
