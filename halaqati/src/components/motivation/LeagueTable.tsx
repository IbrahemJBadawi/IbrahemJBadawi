import { cx } from "@/components/ui";
import type { LeagueRow } from "@/lib/data/motivation";

const MEDAL = ["🥇", "🥈", "🥉"];

export function LeagueTable({ rows, limit }: { rows: LeagueRow[]; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  const me = rows.find((r) => r.is_me);
  return (
    <ol className="flex flex-col gap-1.5">
      {shown.map((r) => (
        <li key={r.student_id} className={cx("flex items-center gap-3 rounded-[14px] px-3 py-2", r.is_me ? "bg-brand-100 font-bold text-brand-900" : "bg-deep")}>
          <span className="w-7 text-center text-lg tabular-nums" aria-label={`المركز ${r.rank}`}>{r.rank <= 3 && r.points > 0 ? MEDAL[r.rank - 1] : r.rank}</span>
          <span className="min-w-0 flex-1 truncate">{r.name}{r.is_me ? " (أنت)" : ""}</span>
          <span className="tabular-nums">{r.points} <span className="text-xs font-normal text-muted">نقطة</span></span>
        </li>
      ))}
      {limit && me && !shown.includes(me) && (
        <li className="flex items-center gap-3 rounded-[14px] bg-brand-100 px-3 py-2 font-bold text-brand-900">
          <span className="w-7 text-center tabular-nums">{me.rank}</span>
          <span className="flex-1">أنت</span>
          <span className="tabular-nums">{me.points} <span className="text-xs font-normal text-muted">نقطة</span></span>
        </li>
      )}
    </ol>
  );
}
