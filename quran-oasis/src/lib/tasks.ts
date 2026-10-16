import type { TaskType } from "@/lib/store/types";

export interface TaskTemplate {
  type: Exclude<TaskType, "custom">;
  title: string;
  description: string;
  href: string;
  recommended?: boolean;
}

export const TASK_CATALOG: TaskTemplate[] = [
  { type: "reading", title: "قراءة الورد اليومي", description: "يكتمل تلقائيًا عند بلوغ هدفك اليومي", href: "/quran", recommended: true },
  { type: "morning", title: "أذكار الصباح", description: "يكتمل عند إتمام عدّاد أذكار الصباح", href: "/adhkar/morning", recommended: true },
  { type: "evening", title: "أذكار المساء", description: "يكتمل عند إتمام عدّاد أذكار المساء", href: "/adhkar/evening", recommended: true },
  { type: "oasis", title: "لحظة واحة", description: "يكتمل عند فتح لحظة اليوم", href: "/oasis" },
  { type: "after-prayer", title: "أذكار بعد الصلاة", description: "يكتمل عند إتمام عدّاد أذكار بعد الصلاة", href: "/adhkar/after-prayer" },
  { type: "sleep", title: "أذكار النوم", description: "يكتمل عند إتمام عدّاد أذكار النوم", href: "/adhkar/sleep" },
  { type: "hifz-new", title: "حفظ آيات جديدة", description: "يكتمل عند تسجيل مقطع محفوظ جديد اليوم", href: "/hifz" },
  { type: "hifz-review", title: "مراجعة المحفوظ", description: "يكتمل عند إنهاء المراجعات المستحقة", href: "/hifz" },
  { type: "lesson", title: "إكمال درس", description: "يكتمل عند إنهاء درس اليوم", href: "/learn" },
];

export function taskHref(type: TaskType): string | null {
  return TASK_CATALOG.find((t) => t.type === type)?.href ?? null;
}
