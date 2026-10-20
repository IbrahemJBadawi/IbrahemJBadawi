"use client";

/**
 * مخزن حالة المستخدم: يعمل محليًا للجميع (بما في ذلك الزائر)،
 * ويُبلغ طبقة المزامنة بالشرائح التي تغيّرت لتُرفع إلى الحساب عند تسجيل الدخول.
 * لا يُخزَّن هنا أي رمز مصادقة أو كلمة مرور؛ جلسة Supabase تديرها مكتبتها بشكل مستقل.
 */
import { useSyncExternalStore } from "react";
import { emptyState, hydrate } from "./defaults";
import type { SyncSlice, UserState } from "./types";

const STORAGE_KEY = "qo:state:v1";
const MAX_LOG_DAYS = 400;

let state: UserState = emptyState();
let loaded = false;
const listeners = new Set<() => void>();
const dirtyListeners = new Set<(slices: SyncSlice[]) => void>();

function prune(s: UserState): UserState {
  const trim = <T,>(obj: Record<string, T>) => {
    const keys = Object.keys(obj).sort();
    if (keys.length <= MAX_LOG_DAYS) return obj;
    const keep = new Set(keys.slice(-MAX_LOG_DAYS));
    return Object.fromEntries(Object.entries(obj).filter(([k]) => keep.has(k)));
  };
  return { ...s, adhkarLog: trim(s.adhkarLog), taskLog: trim(s.taskLog), tasbih: trim(s.tasbih), prayerLog: trim(s.prayerLog) };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) state = hydrate(JSON.parse(raw));
  } catch {
    state = emptyState();
  }
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      state = hydrate(JSON.parse(e.newValue));
      listeners.forEach((l) => l());
    } catch {
      /* تجاهل البيانات التالفة من تبويب آخر */
    }
  });
}

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* التخزين ممتلئ أو معطّل؛ تبقى البيانات في الذاكرة لهذه الجلسة */
  }
}

export function getState(): UserState {
  load();
  return state;
}

/** تعديل الحالة. slices = الشرائح التي تغيّرت (لإرسالها للمزامنة). */
export function setState(updater: (s: UserState) => UserState, slices: SyncSlice[], opts: { silent?: boolean } = {}) {
  load();
  state = prune(updater(state));
  persist();
  listeners.forEach((l) => l());
  if (!opts.silent && slices.length) dirtyListeners.forEach((l) => l(slices));
}

export function replaceState(next: UserState) {
  load();
  state = prune(next);
  persist();
  listeners.forEach((l) => l());
}

export function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function onDirty(l: (slices: SyncSlice[]) => void) {
  dirtyListeners.add(l);
  return () => dirtyListeners.delete(l);
}

const SERVER_STATE = emptyState();

/** خطاف للقراءة من المخزن مع اختيار جزء محدد لتقليل إعادة الرسم. */
export function useStore<T>(selector: (s: UserState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getState()),
    () => selector(SERVER_STATE),
  );
}

/** هل تم تحميل الحالة المحلية؟ (لتجنّب وميض الحالة الفارغة قبل القراءة من التخزين) */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

/** قيم فارغة ثابتة المرجع لاستخدامها داخل المحددات (تجنّب إنشاء كائن جديد في كل قراءة). */
export const EMPTY_OBJ: Readonly<Record<string, never>> = Object.freeze({});
export const EMPTY_ARR: readonly never[] = Object.freeze([]);
