import type { Settings, UserState } from "./types";

export const EPOCH = "1970-01-01T00:00:00.000Z";

export function defaultSettings(): Settings {
  return {
    updatedAt: EPOCH,
    fontScale: 1,
    theme: "system",
    focusMode: false,
    dailyGoal: { enabled: true, unit: "pages", amount: 2 },
    trackedAdhkar: ["morning", "evening"],
    reminders: { enabled: false, days: [0, 1, 2, 3, 4, 5, 6], morning: null, evening: null, reading: null },
  };
}

export function emptyState(): UserState {
  return {
    v: 1,
    ownerId: null,
    settings: defaultSettings(),
    lastRead: null,
    bookmarks: {},
    readingLog: {},
    adhkarLog: {},
    adhkarFavorites: {},
    tasks: {},
    taskLog: {},
    khatmas: {},
    hifz: {},
    lessons: {},
    journal: {},
    oasisFavorites: {},
    oasisSeen: {},
    tasbih: {},
    prayerLog: {},
  };
}

/** يدمج الحالة المحفوظة مع القيم الافتراضية لتحمّل الإصدارات الأقدم أو البيانات الناقصة. */
export function hydrate(raw: unknown): UserState {
  const base = emptyState();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<UserState>;
  const isObj = (x: unknown): x is Record<string, never> => !!x && typeof x === "object" && !Array.isArray(x);
  return {
    ...base,
    ownerId: typeof r.ownerId === "string" ? r.ownerId : null,
    settings: isObj(r.settings)
      ? {
          ...base.settings,
          ...(r.settings as object),
          dailyGoal: { ...base.settings.dailyGoal, ...((r.settings as Settings).dailyGoal ?? {}) },
          reminders: { ...base.settings.reminders, ...((r.settings as Settings).reminders ?? {}) },
        }
      : base.settings,
    lastRead: isObj(r.lastRead) ? (r.lastRead as UserState["lastRead"]) : null,
    bookmarks: isObj(r.bookmarks) ? r.bookmarks : {},
    readingLog: isObj(r.readingLog) ? r.readingLog : {},
    adhkarLog: isObj(r.adhkarLog) ? r.adhkarLog : {},
    adhkarFavorites: isObj(r.adhkarFavorites) ? r.adhkarFavorites : {},
    tasks: isObj(r.tasks) ? r.tasks : {},
    taskLog: isObj(r.taskLog) ? r.taskLog : {},
    khatmas: isObj(r.khatmas) ? r.khatmas : {},
    hifz: isObj(r.hifz) ? r.hifz : {},
    lessons: isObj(r.lessons) ? r.lessons : {},
    journal: isObj(r.journal) ? r.journal : {},
    oasisFavorites: isObj(r.oasisFavorites) ? r.oasisFavorites : {},
    oasisSeen: isObj(r.oasisSeen) ? r.oasisSeen : {},
    tasbih: isObj(r.tasbih) ? r.tasbih : {},
    prayerLog: isObj(r.prayerLog) ? r.prayerLog : {},
  };
}
