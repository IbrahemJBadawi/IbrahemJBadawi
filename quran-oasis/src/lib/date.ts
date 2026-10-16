/** مفتاح اليوم المحلي بصيغة YYYY-MM-DD (بتوقيت جهاز المستخدم). */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseDayKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

export function daysBetween(fromKey: string, toKey: string): number {
  const ms = parseDayKey(toKey).getTime() - parseDayKey(fromKey).getTime();
  return Math.round(ms / 86_400_000);
}

export function lastNDays(n: number, end: string = dayKey()): string[] {
  return Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));
}

export function formatGregorian(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);
}

/**
 * التاريخ الهجري وفق تقويم أم القرى (مدمج في محرك Intl للمتصفح).
 * يعيد null إن لم يدعمه المتصفح، فلا نعرض تاريخًا غير موثوق.
 * قد يختلف بيوم عن الرؤية المحلية في بعض البلدان.
 */
export function formatHijri(d: Date = new Date()): string | null {
  try {
    const fmt = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (fmt.resolvedOptions().calendar !== "islamic-umalqura") return null;
    return fmt.format(d);
  } catch {
    return null;
  }
}

export function formatShortDate(key: string): string {
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(parseDayKey(key));
}

export function weekdayShort(key: string): string {
  return new Intl.DateTimeFormat("ar", { weekday: "short" }).format(parseDayKey(key));
}

export function partOfDay(d: Date = new Date()): "morning" | "afternoon" | "evening" | "night" {
  const h = d.getHours();
  if (h >= 4 && h < 12) return "morning";
  if (h >= 12 && h < 16) return "afternoon";
  if (h >= 16 && h < 21) return "evening";
  return "night";
}
