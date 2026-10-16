/** يقبل فقط المسارات الداخلية لمنع إعادة التوجيه المفتوحة (open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/today"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
