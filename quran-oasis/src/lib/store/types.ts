import type { DhikrCategoryId } from "@/content/adhkar";
import type { Range } from "@/lib/ranges";

/** كل سجل قابل للمزامنة يحمل وقت آخر تعديل، والحذف يتم بعلامة (tombstone) لتعمل المزامنة بين الأجهزة. */
export interface Stamped {
  updatedAt: string;
  deleted?: boolean;
}

export type ThemePref = "system" | "light" | "dark";
export type GoalUnit = "pages" | "ayahs";

export interface Settings extends Stamped {
  fontScale: number; // 0.8 .. 1.8
  theme: ThemePref;
  focusMode: boolean;
  dailyGoal: { enabled: boolean; unit: GoalUnit; amount: number };
  trackedAdhkar: DhikrCategoryId[];
  reminders: {
    enabled: boolean;
    days: number[]; // 0 = الأحد
    morning: string | null; // "06:30"
    evening: string | null;
    reading: string | null;
  };
}

export interface LastRead extends Stamped {
  surah: number;
  ayah: number;
}

export interface Bookmark extends Stamped {
  id: string;
  kind: "favorite" | "bookmark";
  surah: number;
  ayah: number;
  note?: string;
  createdAt: string;
}

export type TaskType =
  | "reading"
  | "morning"
  | "evening"
  | "sleep"
  | "after-prayer"
  | "hifz-new"
  | "hifz-review"
  | "lesson"
  | "oasis"
  | "custom";

export interface DailyTask extends Stamped {
  id: string;
  type: TaskType;
  title: string;
  active: boolean;
  order: number;
}

export interface TaskMark extends Stamped {
  done: boolean;
}

export interface Khatma extends Stamped {
  id: string;
  title: string;
  startDate: string; // dayKey
  days: number;
  status: "active" | "paused" | "done";
  createdAt: string;
}

export type HifzStatus = "learning" | "memorized";

export interface HifzReview {
  date: string;
  quality: "good" | "weak";
}

export interface HifzSegment extends Stamped {
  id: string;
  surah: number;
  from: number;
  to: number;
  status: HifzStatus;
  notes: string;
  createdAt: string; // dayKey
  stage: number; // مؤشر فترة المراجعة
  nextReview: string; // dayKey
  reviews: HifzReview[];
}

export interface DhikrCount extends Stamped {
  c: number;
}

export interface LessonMark extends Stamped {
  completedAt: string; // dayKey
}

export interface JournalEntry extends Stamped {
  momentId: string;
  date: string;
  text: string;
}

export interface UserState {
  v: 1;
  /** معرف صاحب البيانات المحلية؛ null = زائر. */
  ownerId: string | null;
  settings: Settings;
  lastRead: LastRead | null;
  bookmarks: Record<string, Bookmark>;
  /** الآيات المقروءة يوميًا (أرقام تسلسلية) */
  readingLog: Record<string, Range[]>;
  /** عدّاد الأذكار: اليوم ← معرف الذكر ← العدد */
  adhkarLog: Record<string, Record<string, DhikrCount>>;
  adhkarFavorites: Record<string, Stamped>;
  tasks: Record<string, DailyTask>;
  taskLog: Record<string, Record<string, TaskMark>>;
  khatmas: Record<string, Khatma>;
  hifz: Record<string, HifzSegment>;
  lessons: Record<string, LessonMark>;
  journal: Record<string, JournalEntry>;
  oasisFavorites: Record<string, Stamped>;
  /** سجل لحظات واحة التي عُرضت: اليوم ← معرف اللحظة */
  oasisSeen: Record<string, string>;
}

/** الشرائح التي تُخزّن كل منها كوثيقة مستقلة في قاعدة البيانات. */
export const SYNC_SLICES = [
  "settings",
  "lastRead",
  "bookmarks",
  "readingLog",
  "adhkarLog",
  "adhkarFavorites",
  "tasks",
  "taskLog",
  "khatmas",
  "hifz",
  "lessons",
  "journal",
  "oasisFavorites",
  "oasisSeen",
] as const;

export type SyncSlice = (typeof SYNC_SLICES)[number];
