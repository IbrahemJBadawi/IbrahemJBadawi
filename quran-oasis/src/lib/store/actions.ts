"use client";

import { addDays, dayKey } from "@/lib/date";
import { addRange, type Range } from "@/lib/ranges";
import { globalAyahId, isValidRef } from "@/lib/quran";
import { setState, getState } from "./store";
import type {
  Bookmark,
  DailyTask,
  HifzSegment,
  Khatma,
  Settings,
  TaskType,
} from "./types";

const now = () => new Date().toISOString();
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// ───────── الإعدادات ─────────
export function updateSettings(patch: Partial<Omit<Settings, "updatedAt">>) {
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch, updatedAt: now() } }), ["settings"]);
}

// ───────── القراءة ─────────
export function saveLastRead(surah: number, ayah: number) {
  if (!isValidRef(surah, ayah)) return;
  const cur = getState().lastRead;
  if (cur && cur.surah === surah && cur.ayah === ayah) return;
  setState((s) => ({ ...s, lastRead: { surah, ayah, updatedAt: now() } }), ["lastRead"]);
}

/** تسجيل آيات مقروءة (أرقام تسلسلية) في سجل اليوم. */
export function logReading(range: Range, day: string = dayKey()) {
  setState(
    (s) => ({ ...s, readingLog: { ...s.readingLog, [day]: addRange(s.readingLog[day] ?? [], range) } }),
    ["readingLog"],
  );
}

export function logReadingRef(surah: number, from: number, to: number, day?: string) {
  if (!isValidRef(surah, from) || !isValidRef(surah, to)) return;
  logReading([globalAyahId(surah, Math.min(from, to)), globalAyahId(surah, Math.max(from, to))], day);
}

// ───────── المفضلة والعلامات ─────────
export function bookmarkId(kind: Bookmark["kind"], surah: number, ayah: number) {
  return kind === "bookmark" ? "bookmark" : `fav:${surah}:${ayah}`;
}

/** المفضلة: عدد غير محدود من الآيات. */
export function toggleFavorite(surah: number, ayah: number) {
  const id = bookmarkId("favorite", surah, ayah);
  setState((s) => {
    const cur = s.bookmarks[id];
    const active = cur && !cur.deleted;
    const next: Bookmark = active
      ? { ...cur, deleted: true, updatedAt: now() }
      : { id, kind: "favorite", surah, ayah, createdAt: now(), updatedAt: now() };
    return { ...s, bookmarks: { ...s.bookmarks, [id]: next } };
  }, ["bookmarks"]);
}

/** العلامة المرجعية: علامة واحدة تنتقل إلى الموضع الجديد (مثل شريط المصحف). */
export function setBookmark(surah: number, ayah: number) {
  const id = "bookmark";
  setState((s) => {
    const cur = s.bookmarks[id];
    const same = cur && !cur.deleted && cur.surah === surah && cur.ayah === ayah;
    const next: Bookmark = same
      ? { ...cur, deleted: true, updatedAt: now() }
      : { id, kind: "bookmark", surah, ayah, createdAt: now(), updatedAt: now() };
    return { ...s, bookmarks: { ...s.bookmarks, [id]: next } };
  }, ["bookmarks"]);
}

export function setFavoriteNote(surah: number, ayah: number, note: string) {
  const id = bookmarkId("favorite", surah, ayah);
  setState((s) => {
    const cur = s.bookmarks[id];
    if (!cur || cur.deleted) return s;
    return { ...s, bookmarks: { ...s.bookmarks, [id]: { ...cur, note: note.slice(0, 1000), updatedAt: now() } } };
  }, ["bookmarks"]);
}

// ───────── الأذكار ─────────
export function setDhikrCount(dhikrId: string, count: number, day: string = dayKey()) {
  setState(
    (s) => ({
      ...s,
      adhkarLog: {
        ...s.adhkarLog,
        [day]: { ...(s.adhkarLog[day] ?? {}), [dhikrId]: { c: Math.max(0, Math.round(count)), updatedAt: now() } },
      },
    }),
    ["adhkarLog"],
  );
}

/** إعادة ضبط عدادات مجموعة أذكار لليوم (تُزامن كقيمة صفر بتاريخ أحدث). */
export function resetDhikrCounts(ids: string[], day: string = dayKey()) {
  setState((s) => {
    const cur = { ...(s.adhkarLog[day] ?? {}) };
    for (const id of ids) cur[id] = { c: 0, updatedAt: now() };
    return { ...s, adhkarLog: { ...s.adhkarLog, [day]: cur } };
  }, ["adhkarLog"]);
}

export function toggleDhikrFavorite(id: string) {
  setState((s) => {
    const cur = s.adhkarFavorites[id];
    const active = cur && !cur.deleted;
    return {
      ...s,
      adhkarFavorites: { ...s.adhkarFavorites, [id]: { updatedAt: now(), deleted: active ? true : undefined } },
    };
  }, ["adhkarFavorites"]);
}

// ───────── مهام اليوم ─────────
export function addTask(type: TaskType, title: string) {
  const s = getState();
  const exists = Object.values(s.tasks).find((t) => !t.deleted && t.type === type && type !== "custom");
  if (exists) {
    if (!exists.active) updateTask(exists.id, { active: true });
    return exists.id;
  }
  const id = uid();
  const order = Object.values(s.tasks).filter((t) => !t.deleted).length;
  const task: DailyTask = { id, type, title: title.slice(0, 120), active: true, order, updatedAt: now() };
  setState((st) => ({ ...st, tasks: { ...st.tasks, [id]: task } }), ["tasks"]);
  return id;
}

export function updateTask(id: string, patch: Partial<Pick<DailyTask, "title" | "active" | "order">>) {
  setState((s) => {
    const cur = s.tasks[id];
    if (!cur) return s;
    return { ...s, tasks: { ...s.tasks, [id]: { ...cur, ...patch, updatedAt: now() } } };
  }, ["tasks"]);
}

export function removeTask(id: string) {
  setState((s) => {
    const cur = s.tasks[id];
    if (!cur) return s;
    return { ...s, tasks: { ...s.tasks, [id]: { ...cur, deleted: true, active: false, updatedAt: now() } } };
  }, ["tasks"]);
}

export function markTask(id: string, done: boolean, day: string = dayKey()) {
  setState(
    (s) => ({
      ...s,
      taskLog: { ...s.taskLog, [day]: { ...(s.taskLog[day] ?? {}), [id]: { done, updatedAt: now() } } },
    }),
    ["taskLog"],
  );
}

// ───────── الختمة ─────────
export function createKhatma(title: string, startDate: string, days: number) {
  const id = uid();
  const k: Khatma = {
    id,
    title: title.trim().slice(0, 80) || "ختمتي",
    startDate,
    days: Math.max(1, Math.min(3650, Math.round(days))),
    status: "active",
    createdAt: now(),
    updatedAt: now(),
  };
  setState((s) => {
    // ختمة نشطة واحدة فقط في الوقت نفسه
    const khatmas = Object.fromEntries(
      Object.entries(s.khatmas).map(([kid, x]) => [
        kid,
        x.status === "active" && !x.deleted ? { ...x, status: "paused" as const, updatedAt: now() } : x,
      ]),
    );
    return { ...s, khatmas: { ...khatmas, [id]: k } };
  }, ["khatmas"]);
  return id;
}

export function updateKhatma(id: string, patch: Partial<Pick<Khatma, "title" | "days" | "status" | "startDate">>) {
  setState((s) => {
    const cur = s.khatmas[id];
    if (!cur) return s;
    let khatmas = s.khatmas;
    if (patch.status === "active") {
      khatmas = Object.fromEntries(
        Object.entries(khatmas).map(([kid, x]) => [
          kid,
          kid !== id && x.status === "active" ? { ...x, status: "paused" as const, updatedAt: now() } : x,
        ]),
      );
    }
    return { ...s, khatmas: { ...khatmas, [id]: { ...cur, ...patch, updatedAt: now() } } };
  }, ["khatmas"]);
}

export function deleteKhatma(id: string) {
  setState((s) => {
    const cur = s.khatmas[id];
    if (!cur) return s;
    return { ...s, khatmas: { ...s.khatmas, [id]: { ...cur, deleted: true, updatedAt: now() } } };
  }, ["khatmas"]);
}

// ───────── الحفظ والمراجعة ─────────
/** فترات المراجعة بالأيام (تكرار متباعد مبسّط). */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

export function addHifzSegment(input: { surah: number; from: number; to: number; status: HifzSegment["status"]; notes?: string }) {
  if (!isValidRef(input.surah, input.from) || !isValidRef(input.surah, input.to)) {
    throw new Error("المقطع غير صحيح: تحقق من أرقام الآيات.");
  }
  const id = uid();
  const today = dayKey();
  const seg: HifzSegment = {
    id,
    surah: input.surah,
    from: Math.min(input.from, input.to),
    to: Math.max(input.from, input.to),
    status: input.status,
    notes: (input.notes ?? "").slice(0, 2000),
    createdAt: today,
    stage: 0,
    nextReview: addDays(today, REVIEW_INTERVALS[0]),
    reviews: [],
    updatedAt: now(),
  };
  setState((s) => ({ ...s, hifz: { ...s.hifz, [id]: seg } }), ["hifz"]);
  return id;
}

export function updateHifzSegment(id: string, patch: Partial<Pick<HifzSegment, "notes" | "status" | "nextReview">>) {
  setState((s) => {
    const cur = s.hifz[id];
    if (!cur) return s;
    return {
      ...s,
      hifz: { ...s.hifz, [id]: { ...cur, ...patch, notes: (patch.notes ?? cur.notes).slice(0, 2000), updatedAt: now() } },
    };
  }, ["hifz"]);
}

export function recordHifzReview(id: string, quality: "good" | "weak") {
  const today = dayKey();
  setState((s) => {
    const cur = s.hifz[id];
    if (!cur) return s;
    const stage = quality === "good" ? Math.min(cur.stage + 1, REVIEW_INTERVALS.length - 1) : 0;
    const next: HifzSegment = {
      ...cur,
      stage,
      nextReview: addDays(today, REVIEW_INTERVALS[stage]),
      reviews: [...cur.reviews, { date: today, quality }].slice(-100),
      status: cur.status === "learning" && quality === "good" && stage >= 2 ? "memorized" : cur.status,
      updatedAt: now(),
    };
    return { ...s, hifz: { ...s.hifz, [id]: next } };
  }, ["hifz"]);
}

export function deleteHifzSegment(id: string) {
  setState((s) => {
    const cur = s.hifz[id];
    if (!cur) return s;
    return { ...s, hifz: { ...s.hifz, [id]: { ...cur, deleted: true, updatedAt: now() } } };
  }, ["hifz"]);
}

// ───────── الدروس ─────────
export function setLessonComplete(key: string, done: boolean) {
  setState(
    (s) => ({
      ...s,
      lessons: { ...s.lessons, [key]: { completedAt: dayKey(), updatedAt: now(), deleted: done ? undefined : true } },
    }),
    ["lessons"],
  );
}

// ───────── لحظة واحة ─────────
export function saveJournal(momentId: string, date: string, text: string) {
  const id = `${date}:${momentId}`;
  setState(
    (s) => ({
      ...s,
      journal: {
        ...s.journal,
        [id]: { momentId, date, text: text.slice(0, 5000), updatedAt: now(), deleted: text.trim() ? undefined : true },
      },
    }),
    ["journal"],
  );
}

export function toggleOasisFavorite(momentId: string) {
  setState((s) => {
    const cur = s.oasisFavorites[momentId];
    const active = cur && !cur.deleted;
    return {
      ...s,
      oasisFavorites: { ...s.oasisFavorites, [momentId]: { updatedAt: now(), deleted: active ? true : undefined } },
    };
  }, ["oasisFavorites"]);
}

export function markOasisSeen(day: string, momentId: string) {
  if (getState().oasisSeen[day] === momentId) return;
  setState((s) => ({ ...s, oasisSeen: { ...s.oasisSeen, [day]: momentId } }), ["oasisSeen"]);
}

// ───────── المسبحة ─────────
export function setTasbihCount(phraseId: string, count: number, day: string = dayKey()) {
  setState(
    (s) => ({
      ...s,
      tasbih: { ...s.tasbih, [day]: { ...(s.tasbih[day] ?? {}), [phraseId]: { c: Math.max(0, Math.round(count)), updatedAt: now() } } },
    }),
    ["tasbih"],
  );
}

// ───────── متابعة الصلوات (اختيارية) ─────────
export function markPrayer(key: string, done: boolean, day: string = dayKey()) {
  setState(
    (s) => ({
      ...s,
      prayerLog: { ...s.prayerLog, [day]: { ...(s.prayerLog[day] ?? {}), [key]: { done, updatedAt: now() } } },
    }),
    ["prayerLog"],
  );
}
