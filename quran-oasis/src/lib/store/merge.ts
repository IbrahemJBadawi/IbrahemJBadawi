/**
 * قواعد دمج البيانات بين الجهاز والحساب. الدمج حتمي وتبادلي:
 * merge(a, b) يعطي النتيجة نفسها مهما كان الترتيب، فلا تضيع بيانات بين الأجهزة.
 */
import { unionRanges, type Range } from "@/lib/ranges";
import type { Stamped, SyncSlice, UserState } from "./types";

function newer<T extends Stamped>(a: T | null | undefined, b: T | null | undefined): T | null {
  if (!a) return b ?? null;
  if (!b) return a;
  if (a.updatedAt === b.updatedAt) return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
  return a.updatedAt > b.updatedAt ? a : b;
}

function mergeRecords<T extends Stamped>(a: Record<string, T> = {}, b: Record<string, T> = {}): Record<string, T> {
  const out: Record<string, T> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const v = newer(a[k], b[k]);
    if (v) out[k] = v;
  }
  return out;
}

function mergeNested<T extends Stamped>(
  a: Record<string, Record<string, T>> = {},
  b: Record<string, Record<string, T>> = {},
) {
  const out: Record<string, Record<string, T>> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = mergeRecords(a[k], b[k]);
  return out;
}

function mergeReading(a: Record<string, Range[]> = {}, b: Record<string, Range[]> = {}) {
  const out: Record<string, Range[]> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out[k] = unionRanges(a[k] ?? [], b[k] ?? []);
  return out;
}

function mergeSeen(a: Record<string, string> = {}, b: Record<string, string> = {}) {
  const out: Record<string, string> = { ...a };
  for (const [k, v] of Object.entries(b)) if (!out[k] || v < out[k]) out[k] = v;
  return out;
}

export function mergeSlice<K extends SyncSlice>(slice: K, a: UserState[K], b: UserState[K]): UserState[K] {
  switch (slice) {
    case "settings":
    case "lastRead":
      return newer(a as Stamped, b as Stamped) as UserState[K];
    case "readingLog":
      return mergeReading(a as UserState["readingLog"], b as UserState["readingLog"]) as UserState[K];
    case "adhkarLog":
      return mergeNested(a as UserState["adhkarLog"], b as UserState["adhkarLog"]) as UserState[K];
    case "taskLog":
      return mergeNested(a as UserState["taskLog"], b as UserState["taskLog"]) as UserState[K];
    case "oasisSeen":
      return mergeSeen(a as UserState["oasisSeen"], b as UserState["oasisSeen"]) as UserState[K];
    default:
      return mergeRecords(a as Record<string, Stamped>, b as Record<string, Stamped>) as UserState[K];
  }
}

export function mergeStates(a: UserState, b: UserState, slices: readonly SyncSlice[]): UserState {
  const out = { ...a };
  for (const s of slices) (out as Record<string, unknown>)[s] = mergeSlice(s, a[s], b[s]);
  return out;
}
