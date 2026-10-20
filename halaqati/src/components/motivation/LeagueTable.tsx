import { cx } from "@/components/ui";
import type { LeagueRow } from "@/lib/data/motivation";

const MEDAL = ["🥇", "🥈", "🥉"];

function Avatar({ row, images, size }: { row: LeagueRow; images?: Map<string, string>; size?: string }) {
  const src = images?.get(row.student_id);
  // eslint-disable-next-line @next/next/no-img-element
  if (src) return <img src={src} alt="" className={cx("rounded-full object-cover", size)} />;
  return <span aria-hidden>{row.name.trim().charAt(0)}</span>;
}

/** Top three on a podium (2-1-3), then the ranked list. */
export function LeaguePodium({ rows, images }: { rows: LeagueRow[]; images?: Map<string, string> }) {
  const top = rows.slice(0, 3);
  if (top.length < 3 || top[0].points <= 0) return null;
  const order = [top[1], top[0], top[2]];
  return (
    <ol className="podium mb-4" aria-label="المراكز الثلاثة الأولى">
      {order.map((r) => {
        const first = r === top[0];
        return (
          <li key={r.student_id} className={cx("podium-card", first && "is-first", r.is_me && "is-me")}>
            {first && <span className="text-xl" aria-hidden>👑</span>}
            <span className="podium-avatar"><Avatar row={r} images={images} size="size-full" /></span>
            <span className="podium-rank" aria-label={`المركز ${r.rank}`}>{r.rank}</span>
            <span className="w-full truncate text-sm font-bold">{r.name}{r.is_me ? " (أنت)" : ""}</span>
            <span className="text-sm tabular-nums text-brand-800">{r.points} <span className="text-xs text-muted">نقطة</span></span>
          </li>
        );
      })}
    </ol>
  );
}

export function LeagueTable({ rows, limit, images, skipPodium = false }: { rows: LeagueRow[]; limit?: number; images?: Map<string, string>; skipPodium?: boolean }) {
  const start = skipPodium && rows.length >= 3 && rows[0].points > 0 ? 3 : 0;
  const shown = limit ? rows.slice(start, start + limit) : rows.slice(start);
  const me = rows.find((r) => r.is_me);
  return (
    <ol className="flex flex-col gap-1.5" start={start + 1}>
      {shown.map((r) => (
        <li key={r.student_id} className={cx("flex items-center gap-3 rounded-[16px] px-3 py-2", r.is_me ? "bg-brand-100 font-bold text-brand-900" : "bg-deep")}>
          <span className="w-7 text-center text-lg tabular-nums" aria-label={`المركز ${r.rank}`}>{r.rank <= 3 && r.points > 0 ? MEDAL[r.rank - 1] : r.rank}</span>
          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-panel text-sm font-bold text-brand-900"><Avatar row={r} images={images} size="size-8" /></span>
          <span className="min-w-0 flex-1 truncate">{r.name}{r.is_me ? " (أنت)" : ""}</span>
          <span className="tabular-nums">{r.points} <span className="text-xs font-normal text-muted">نقطة</span></span>
        </li>
      ))}
      {limit && me && !shown.includes(me) && !(start && rows.indexOf(me) < start) && (
        <li className="flex items-center gap-3 rounded-[16px] bg-brand-100 px-3 py-2 font-bold text-brand-900">
          <span className="w-7 text-center tabular-nums">{me.rank}</span>
          <span className="flex-1">أنت</span>
          <span className="tabular-nums">{me.points} <span className="text-xs font-normal text-muted">نقطة</span></span>
        </li>
      )}
    </ol>
  );
}
