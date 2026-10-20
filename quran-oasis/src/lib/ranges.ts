/** مدى مغلق [من، إلى] من أرقام الآيات التسلسلية. القوائم دائمًا مرتبة وغير متداخلة. */
export type Range = [number, number];

export function normalizeRanges(ranges: Range[]): Range[] {
  const sorted = ranges
    .filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1]))
    .map(([a, b]) => (a <= b ? [a, b] : [b, a]) as Range)
    .sort((x, y) => x[0] - y[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

export function addRange(ranges: Range[], r: Range): Range[] {
  return normalizeRanges([...ranges, r]);
}

export function unionRanges(...lists: Range[][]): Range[] {
  return normalizeRanges(lists.flat());
}

export function countRanges(ranges: Range[]): number {
  return ranges.reduce((n, [a, b]) => n + (b - a + 1), 0);
}

export function containsId(ranges: Range[], id: number): boolean {
  return ranges.some(([a, b]) => id >= a && id <= b);
}

/** هل المدى r مغطى بالكامل بالقائمة؟ */
export function coversRange(ranges: Range[], r: Range): boolean {
  return ranges.some(([a, b]) => a <= r[0] && b >= r[1]);
}

/** أول رقم غير مغطى ابتداءً من start حتى max، أو null إن كان الكل مغطى. */
export function firstUncovered(ranges: Range[], start: number, max: number): number | null {
  let cur = start;
  for (const [a, b] of normalizeRanges(ranges)) {
    if (b < cur) continue;
    if (a > cur) break;
    cur = b + 1;
  }
  return cur <= max ? cur : null;
}
