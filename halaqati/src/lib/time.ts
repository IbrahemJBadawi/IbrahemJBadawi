/** Timezone helpers without external libraries. */

function offsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - utcMs;
}

/** "2026-10-20T17:30" interpreted in `timeZone` → ISO UTC string. */
export function localToUtcIso(local: string, timeZone: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let guess = naive - offsetMs(naive, timeZone);
  guess = naive - offsetMs(guess, timeZone);
  return new Date(guess).toISOString();
}

/** ISO UTC → "YYYY-MM-DDTHH:MM" in `timeZone` (for datetime-local inputs). */
export function utcToLocalInput(iso: string, timeZone: string): string {
  const ms = new Date(iso).getTime();
  const d = new Date(ms + offsetMs(ms, timeZone));
  return d.toISOString().slice(0, 16);
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Start/end of "today" in a timezone, as ISO strings. */
export function dayBoundsUtc(timeZone: string, now = new Date()): { start: string; end: string } {
  const local = utcToLocalInput(now.toISOString(), timeZone).slice(0, 10);
  const start = localToUtcIso(`${local}T00:00`, timeZone)!;
  const end = new Date(new Date(start).getTime() + 24 * 3600 * 1000).toISOString();
  return { start, end };
}

/** Request-time timestamp offset by `ms` (server components render once per request). */
export function isoFromNow(ms = 0): string {
  return new Date(Date.now() + ms).toISOString();
}
