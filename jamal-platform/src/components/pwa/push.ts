"use client";

import { subscribePushAction, unsubscribePushAction } from "@/lib/actions/push";

export type PushSupport = "unsupported" | "needs-install" | "denied" | "granted" | "default";

export function pushSupport(): PushSupport {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
    // iPhone/iPad only allow web push from the installed app (iOS 16.4+).
    if (typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent)) return "needs-install";
    return "unsupported";
  }
  if (!("PushManager" in window)) return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "needs-install" : "unsupported";
  return Notification.permission as PushSupport;
}

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Asks for permission (must run from a tap) and registers this device with the server. */
export async function enablePush(order?: { number: string; token: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "لم يتم السماح بالإشعارات. يمكنك تفعيلها لاحقًا من إعدادات المتصفح." };
    const reg = (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
    await navigator.serviceWorker.ready;
    const { publicKey } = (await (await fetch("/api/push/key")).json()) as { publicKey: string };
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
    return await subscribePushAction({ subscription: sub.toJSON(), order });
  } catch {
    return { ok: false, error: "تعذّر تفعيل الإشعارات على هذا الجهاز." };
  }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await unsubscribePushAction(sub.endpoint);
  await sub.unsubscribe();
}

export async function isSubscribed() {
  if (pushSupport() !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return !!(await reg?.pushManager.getSubscription());
}
