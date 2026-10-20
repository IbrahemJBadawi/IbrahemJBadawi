"use client";

/**
 * حفظ محلي متين لبيانات المستخدم (دون أي خادم):
 * 1) localStorage — النسخة السريعة الأساسية (store.ts).
 * 2) IndexedDB — نسخة مرآة تُحدَّث تلقائيًا، تُستعاد منها البيانات إن مُسح localStorage أو تلف.
 * 3) لقطات يومية تلقائية (آخر 7 أيام) يمكن الرجوع إليها.
 * 4) طلب "تخزين دائم" من المتصفح حتى لا يحذف البيانات عند امتلاء الجهاز.
 * 5) تصدير واستيراد نسخة احتياطية بصيغة JSON مع التحقق منها.
 */
import { useSyncExternalStore } from "react";
import { dayKey } from "@/lib/date";
import { emptyState, hydrate } from "./defaults";
import { getState, replaceState, setState, subscribe } from "./store";
import { SYNC_SLICES, type UserState } from "./types";

const DB_NAME = "quran-oasis";
const STORE = "kv";
const SNAP_PREFIX = "snap:";
const KEEP_SNAPSHOTS = 7;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB غير متاح"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => {
      db.close();
      resolve(r ? (r as IDBRequest<T>).result : undefined);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

const idbGet = <T,>(key: string) => tx<T>("readonly", (s) => s.get(key) as IDBRequest<T>);
const idbPut = (key: string, value: unknown) => tx("readwrite", (s) => void s.put(value, key));
const idbKeys = () => tx<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
const idbDel = (key: string) => tx("readwrite", (s) => void s.delete(key));

export interface LocalStorageInfo {
  ready: boolean;
  idb: boolean;
  persisted: boolean | null;
  usageKb: number | null;
  lastMirror: string | null;
  snapshots: { day: string; at: string }[];
  restoredFromBackup: boolean;
}

let info: LocalStorageInfo = {
  ready: false,
  idb: false,
  persisted: null,
  usageKb: null,
  lastMirror: null,
  snapshots: [],
  restoredFromBackup: false,
};
const listeners = new Set<() => void>();
function setInfo(p: Partial<LocalStorageInfo>) {
  info = { ...info, ...p };
  listeners.forEach((l) => l());
}

export function useLocalStorageInfo() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => info,
    () => info,
  );
}

function hasData(s: UserState) {
  return JSON.stringify({ ...s, ownerId: null, settings: null }) !== JSON.stringify({ ...emptyState(), ownerId: null, settings: null });
}

let timer: ReturnType<typeof setTimeout> | null = null;
async function mirror() {
  const s = getState();
  const at = new Date().toISOString();
  await idbPut("state", { at, state: s });
  const snapKey = `${SNAP_PREFIX}${dayKey()}`;
  if (hasData(s)) await idbPut(snapKey, { at, state: s });
  const keys = ((await idbKeys()) ?? []).map(String).filter((k) => k.startsWith(SNAP_PREFIX)).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_SNAPSHOTS))) await idbDel(k);
  await refreshInfo({ lastMirror: at });
}

async function refreshInfo(extra: Partial<LocalStorageInfo> = {}) {
  const keys = ((await idbKeys().catch(() => [])) ?? []).map(String).filter((k) => k.startsWith(SNAP_PREFIX)).sort().reverse();
  const snapshots: { day: string; at: string }[] = [];
  for (const k of keys) {
    const v = await idbGet<{ at: string }>(k).catch(() => undefined);
    if (v) snapshots.push({ day: k.slice(SNAP_PREFIX.length), at: v.at });
  }
  let usageKb: number | null = null;
  let persisted: boolean | null = null;
  try {
    const est = await navigator.storage?.estimate?.();
    usageKb = est?.usage != null ? Math.round(est.usage / 1024) : null;
    persisted = (await navigator.storage?.persisted?.()) ?? null;
  } catch {}
  setInfo({ snapshots, usageKb, persisted, ...extra });
}

let started = false;
/** يبدأ المرآة المحلية. يُستدعى مرة واحدة من مزوّد التطبيق. */
export async function startLocalPersistence() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    await openDb();
  } catch {
    setInfo({ ready: true, idb: false });
    return;
  }
  // استعادة تلقائية: إن كان localStorage فارغًا أو تالفًا بينما توجد نسخة في IndexedDB
  let restored = false;
  const backup = await idbGet<{ at: string; state: unknown }>("state").catch(() => undefined);
  if (backup && !hasData(getState())) {
    const s = hydrate(backup.state);
    if (hasData(s)) {
      replaceState(s);
      restored = true;
    }
  }
  setInfo({ ready: true, idb: true, restoredFromBackup: restored, lastMirror: backup?.at ?? null });
  subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void mirror().catch(() => {}), 800);
  });
  await mirror().catch(() => {});
}

/** يطلب من المتصفح عدم حذف بيانات الموقع تلقائيًا. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    const ok = (await navigator.storage?.persist?.()) ?? false;
    await refreshInfo();
    return ok;
  } catch {
    return false;
  }
}

export async function restoreSnapshot(day: string): Promise<boolean> {
  const v = await idbGet<{ state: unknown }>(`${SNAP_PREFIX}${day}`);
  if (!v) return false;
  const ownerId = getState().ownerId;
  const next = { ...hydrate(v.state), ownerId };
  setState(() => next, [...SYNC_SLICES]);
  return true;
}

export interface BackupFile {
  app: "quran-oasis";
  version: 1;
  exportedAt: string;
  data: Omit<UserState, "ownerId">;
}

export function buildBackup(): BackupFile {
  const { ownerId: _omit, ...data } = getState();
  void _omit;
  return { app: "quran-oasis", version: 1, exportedAt: new Date().toISOString(), data };
}

/** يتحقق من ملف النسخة الاحتياطية ويعيد الحالة المستعادة، أو يرمي خطأ بالعربية. */
export function parseBackup(text: string): UserState {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("الملف ليس بصيغة JSON صالحة.");
  }
  const r = raw as Partial<BackupFile> & Record<string, unknown>;
  // يدعم صيغة النسخة الحالية، وصيغة التصدير القديمة (الحالة مباشرة)
  const data = r && r.app === "quran-oasis" && r.data ? r.data : r;
  if (!data || typeof data !== "object" || !("settings" in data || "readingLog" in data || "bookmarks" in data)) {
    throw new Error("هذا الملف ليس نسخة احتياطية من واحة القرآن.");
  }
  if (text.length > 5_000_000) throw new Error("حجم الملف أكبر من المسموح.");
  return hydrate(data);
}

export function importBackup(text: string, mode: "replace" | "merge", merge?: (a: UserState, b: UserState) => UserState) {
  const incoming = parseBackup(text);
  const cur = getState();
  const next = mode === "merge" && merge ? merge(cur, incoming) : incoming;
  // استبدال كامل يجب أن يُرفع للمزامنة كذلك؛ نضع وقتًا أحدث للإعدادات لتسود
  const merged = { ...next, ownerId: cur.ownerId, settings: { ...next.settings, updatedAt: new Date().toISOString() } };
  setState(() => merged, [...SYNC_SLICES]);
}

/** يحذف النسخ المحلية في IndexedDB (عند تسجيل الخروج أو مسح البيانات) حتى لا تُستعاد على جهاز مشترك. */
export async function clearLocalBackups() {
  try {
    const keys = ((await idbKeys()) ?? []).map(String);
    for (const k of keys) await idbDel(k);
  } catch {}
  await refreshInfo({ lastMirror: null }).catch(() => {});
}
