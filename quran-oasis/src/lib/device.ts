"use client";

/**
 * إعدادات خاصة بهذا الجهاز فقط ولا تُرسل إلى أي خادم:
 * الموقع (لحساب مواقيت الصلاة والقبلة محليًا)، وطريقة الحساب، وحالة الإعداد الأولي.
 * الموقع يُقرّب إلى منزلتين عشريتين (نحو 1 كم) حفاظًا على الخصوصية.
 */
import { useSyncExternalStore } from "react";

export type MethodId =
  | "UmmAlQura"
  | "Egyptian"
  | "MuslimWorldLeague"
  | "Karachi"
  | "Dubai"
  | "Kuwait"
  | "Qatar"
  | "Turkey"
  | "NorthAmerica"
  | "Singapore"
  | "MoonsightingCommittee";

export type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";

export interface DeviceLocation {
  lat: number;
  lon: number;
  label: string;
  /** المنطقة الزمنية IANA لعرض المواقيت بتوقيت المدينة */
  tz: string;
  source: "gps" | "city";
}

export interface DeviceState {
  v: 1;
  onboarded: boolean;
  location: DeviceLocation | null;
  method: MethodId;
  madhab: "shafi" | "hanafi";
  /** تعديل يدوي بالدقائق لمطابقة تقويم المسجد المحلي */
  adjust: Record<PrayerKey, number>;
  tasbihPhrase: string;
  tasbihTarget: number;
}

const KEY = "qo:device:v1";

export const DEFAULT_DEVICE: DeviceState = {
  v: 1,
  onboarded: false,
  location: null,
  method: "UmmAlQura",
  madhab: "shafi",
  adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  tasbihPhrase: "subhan",
  tasbihTarget: 33,
};

let state: DeviceState = DEFAULT_DEVICE;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw && typeof raw === "object") {
      state = { ...DEFAULT_DEVICE, ...raw, adjust: { ...DEFAULT_DEVICE.adjust, ...(raw.adjust ?? {}) } };
    }
  } catch {
    state = DEFAULT_DEVICE;
  }
}

export function getDevice(): DeviceState {
  load();
  return state;
}

export function setDevice(patch: Partial<DeviceState>) {
  load();
  state = { ...state, ...patch };
  if (patch.location) {
    state.location = {
      ...patch.location,
      lat: Math.round(patch.location.lat * 100) / 100,
      lon: Math.round(patch.location.lon * 100) / 100,
    };
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
  listeners.forEach((l) => l());
}

export function resetDevice() {
  load();
  state = DEFAULT_DEVICE;
  try {
    localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

export function useDevice<T>(selector: (s: DeviceState) => T): T {
  return useSyncExternalStore(
    (l) => {
      load();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(getDevice()),
    () => selector(DEFAULT_DEVICE),
  );
}
