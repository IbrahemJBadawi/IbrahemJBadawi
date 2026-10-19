"use client";

/**
 * Everything the site keeps on the visitor's device, in one place.
 *
 * Only preferences and conveniences live here — nothing is sent anywhere, and
 * the site works the same when storage is blocked (private mode, a full disk):
 * every read and write is wrapped and falls back to the default.
 * The /app page lists these keys and lets the visitor clear them.
 */

import { useCallback, useSyncExternalStore } from "react";

export const STORAGE_KEYS = {
  theme: "tm-theme", // "light" | "dark" | "system"
  following: "tm-following", // { [ventureSlug]: statusWhenFollowed }
  seenUpdates: "tm-seen-updates", // string[] of update ids
  notifiedUpdates: "tm-notified-updates", // string[] already shown as a device notification
  notifications: "tm-notifications", // "on" | "off"
  contactDraft: "tm-contact-draft", // the unsent contact form
  installDismissed: "tm-install-dismissed", // timestamp
  firstVisit: "tm-first-visit", // ISO date — marks updates older than the first visit as seen
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

const EVENT = "tm-storage";

export function readStorage<T>(key: StorageKey, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: StorageKey, value: T | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the preference simply isn't remembered */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function clearAllStorage() {
  for (const key of Object.values(STORAGE_KEYS)) writeStorage(key, null);
}

function subscribe(listener: () => void) {
  // same tab (our own event) and other tabs (the browser's storage event)
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * A value kept in local storage, shared live by every component (and tab)
 * using the same key. Renders `fallback` on the server and before hydration.
 */
export function useStored<T>(key: StorageKey, fallback: T): [T, (value: T | null) => void] {
  // useSyncExternalStore needs a stable snapshot: compare the raw string.
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
  let value = fallback;
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T;
    } catch {
      value = fallback;
    }
  }
  const set = useCallback((next: T | null) => writeStorage(key, next), [key]);
  return [value, set];
}
