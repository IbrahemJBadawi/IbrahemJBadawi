"use client";

/**
 * Device notifications without a server.
 *
 * The site has no backend that could push while it is closed, so it does not
 * pretend to. What it does, honestly: once the visitor allows notifications,
 * every time the site (or the installed app) is opened it checks the news
 * list (src/data/updates.ts) and the ventures the visitor follows, and shows
 * a device notification for anything new since last time. Which ones were
 * shown is remembered in local storage, so nothing is shown twice.
 *
 * Real push (while closed) needs a server with VAPID keys and a store of
 * subscriptions — see docs/DEPLOYMENT.md. public/sw.js already handles `push`.
 */

import { useSyncExternalStore } from "react";
import { STORAGE_KEYS, readStorage, writeStorage } from "./storage";

export type NotifySupport = "unsupported" | "default" | "granted" | "denied";

let listeners: (() => void)[] = [];
function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((entry) => entry !== listener);
  };
}
function current(): NotifySupport {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifySupport;
}

export function useNotifyPermission(): NotifySupport {
  return useSyncExternalStore(subscribe, current, () => "unsupported");
}

export async function enableNotifications(): Promise<NotifySupport> {
  if (current() === "unsupported") return "unsupported";
  const result = (await Notification.requestPermission()) as NotifySupport;
  writeStorage(STORAGE_KEYS.notifications, result === "granted" ? "on" : "off");
  listeners.forEach((listener) => listener());
  return result;
}

export function disableNotifications() {
  writeStorage(STORAGE_KEYS.notifications, "off");
  listeners.forEach((listener) => listener());
}

export function notificationsOn() {
  return current() === "granted" && readStorage<string>(STORAGE_KEYS.notifications, "off") === "on";
}

/** Shows a device notification through the service worker (needed on Android), or directly. */
export async function showNotification(title: string, body: string, url: string, locale: "ar" | "en") {
  if (!notificationsOn()) return false;
  const options: NotificationOptions & { data: { url: string } } = {
    body,
    icon: "/brand/logo-mark.png",
    badge: "/brand/logo-mark.png",
    dir: locale === "ar" ? "rtl" : "ltr",
    lang: locale,
    tag: url,
    data: { url },
  };
  try {
    const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
