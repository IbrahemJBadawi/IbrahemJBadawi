import { WEEKDAYS } from "@/lib/labels";

const LOCALE = "ar-SA-u-nu-latn-ca-gregory";

export function formatDate(value: string | Date, timeZone?: string) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone }).format(new Date(value));
}

export function formatDateTime(value: string | Date, timeZone?: string) {
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value));
}

export type ScheduleSlot = { day: number; start: string; duration: number };

export function formatSchedule(schedule: unknown): string[] {
  if (!Array.isArray(schedule)) return [];
  return (schedule as ScheduleSlot[])
    .filter((s) => typeof s?.day === "number" && typeof s?.start === "string")
    .map((s) => `${WEEKDAYS[s.day] ?? ""} ${s.start}${s.duration ? ` (${s.duration} دقيقة)` : ""}`);
}

export function percent(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
