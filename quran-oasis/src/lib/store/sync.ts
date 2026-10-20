"use client";

/**
 * مزامنة حالة المستخدم مع Supabase (جدول user_documents، وثيقة لكل شريحة).
 * - عند تسجيل الدخول: تُجلب الوثائق وتُدمج مع البيانات المحلية (لا تضيع بيانات الزائر).
 * - عند كل تعديل: تُرفع الشرائح المعدّلة بعد مهلة قصيرة.
 * - عند انقطاع الاتصال: تبقى التعديلات محلية وتُعاد المحاولة تلقائيًا.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { emptyState, hydrate } from "./defaults";
import { mergeStates } from "./merge";
import { clearLocalBackups } from "./persist";
import { getState, onDirty, replaceState } from "./store";
import { SYNC_SLICES, type SyncSlice, type UserState } from "./types";

export type SyncStatus = "disabled" | "idle" | "syncing" | "offline" | "error";

interface SyncInfo {
  status: SyncStatus;
  lastSyncedAt: string | null;
  importedGuestData: boolean;
  error: string | null;
}

let info: SyncInfo = { status: "disabled", lastSyncedAt: null, importedGuestData: false, error: null };
const infoListeners = new Set<() => void>();
function setInfo(patch: Partial<SyncInfo>) {
  info = { ...info, ...patch };
  infoListeners.forEach((l) => l());
}

export function useSyncInfo(): SyncInfo {
  return useSyncExternalStore(
    (l) => {
      infoListeners.add(l);
      return () => infoListeners.delete(l);
    },
    () => info,
    () => info,
  );
}

let session: { client: SupabaseClient; userId: string } | null = null;
const dirty = new Set<SyncSlice>();
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeDirty: (() => void) | null = null;
let flushing: Promise<void> | null = null;

function scheduleFlush(delay = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), delay);
}

async function pushSlices(slices: SyncSlice[]) {
  if (!session || !slices.length) return;
  const s = getState();
  const rows = slices.map((key) => ({
    user_id: session!.userId,
    key,
    data: s[key] ?? null,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await session.client.from("user_documents").upsert(rows, { onConflict: "user_id,key" });
  if (error) throw error;
}

export async function flush(): Promise<void> {
  if (!session || !dirty.size) return;
  if (flushing) return flushing;
  const slices = [...dirty];
  dirty.clear();
  setInfo({ status: "syncing" });
  flushing = pushSlices(slices)
    .then(() => setInfo({ status: "idle", lastSyncedAt: new Date().toISOString(), error: null }))
    .catch((e: Error) => {
      slices.forEach((s) => dirty.add(s));
      const offline = typeof navigator !== "undefined" && !navigator.onLine;
      setInfo({ status: offline ? "offline" : "error", error: offline ? null : e.message });
      scheduleFlush(offline ? 15000 : 30000);
    })
    .finally(() => {
      flushing = null;
    });
  return flushing;
}

function hasUserData(s: UserState): boolean {
  return SYNC_SLICES.some((k) => {
    const v = s[k];
    if (k === "settings") return (v as UserState["settings"]).updatedAt !== emptyState().settings.updatedAt;
    if (v === null) return false;
    return typeof v === "object" && Object.keys(v as object).length > 0;
  });
}

/** يبدأ المزامنة لمستخدم مسجّل. */
export async function startSync(client: SupabaseClient, userId: string) {
  if (session?.userId === userId) return;
  stopSyncListeners();
  session = { client, userId };
  setInfo({ status: "syncing", error: null });

  const { data, error } = await client.from("user_documents").select("key, data").eq("user_id", userId);
  if (session?.userId !== userId) return; // تغيّر المستخدم أثناء الطلب
  if (error) {
    setInfo({ status: navigator.onLine ? "error" : "offline", error: error.message });
    // نستمر محليًا ونحاول لاحقًا
    setTimeout(() => {
      if (session?.userId === userId) {
        session = null;
        void startSync(client, userId);
      }
    }, 30000);
    return;
  }

  const remoteRaw: Record<string, unknown> = {};
  for (const row of data ?? []) remoteRaw[row.key as string] = row.data;
  const remote = hydrate(remoteRaw);
  const local = getState();

  let base: UserState;
  let imported = false;
  if (local.ownerId === userId) base = local;
  else if (local.ownerId === null) {
    base = local; // بيانات الزائر تُنقل إلى الحساب
    imported = hasUserData(local);
  } else base = emptyState(); // بيانات مستخدم آخر على الجهاز نفسه: لا تُخلط

  const merged = mergeStates(base, remote, SYNC_SLICES);
  merged.ownerId = userId;
  replaceState(merged);

  const changed = SYNC_SLICES.filter((k) => JSON.stringify(merged[k]) !== JSON.stringify(remote[k]) || !(k in remoteRaw));
  changed.forEach((k) => dirty.add(k));
  unsubscribeDirty = onDirty((slices) => {
    slices.forEach((s) => dirty.add(s));
    scheduleFlush();
  });
  window.addEventListener("online", onOnline);
  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", onVisibility);
  setInfo({ importedGuestData: imported, status: "idle", lastSyncedAt: new Date().toISOString() });
  if (dirty.size) await flush();
}

const onOnline = () => scheduleFlush(500);
const onHide = () => void flush();
const onVisibility = () => {
  if (document.visibilityState === "hidden") void flush();
};

function stopSyncListeners() {
  unsubscribeDirty?.();
  unsubscribeDirty = null;
  if (timer) clearTimeout(timer);
  timer = null;
  if (typeof window !== "undefined") {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("pagehide", onHide);
    document.removeEventListener("visibilitychange", onVisibility);
  }
}

/** يوقف المزامنة. clearLocal = حذف البيانات المحلية (عند تسجيل الخروج حفاظًا على الخصوصية). */
export async function stopSync({ clearLocal }: { clearLocal: boolean }) {
  try {
    await flush();
  } catch {
    /* تجاهل */
  }
  stopSyncListeners();
  session = null;
  dirty.clear();
  if (clearLocal) {
    replaceState(emptyState());
    await clearLocalBackups();
  }
  setInfo({ status: "disabled", importedGuestData: false, error: null });
}

export function dismissImportNotice() {
  setInfo({ importedGuestData: false });
}
