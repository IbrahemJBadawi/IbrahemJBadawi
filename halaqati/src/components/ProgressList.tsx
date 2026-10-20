import type { ReactNode } from "react";
import { Reactions } from "@/components/motivation/Reactions";
import { Badge } from "@/components/ui";
import type { ReactionSummary } from "@/lib/data/motivation";
import { formatDate } from "@/lib/format";
import { ACTIVITY, ADHERENCE, COMPLETION, ERROR_TYPE, SCORE_LABELS } from "@/lib/labels";
import { formatRange, getSurah } from "@/lib/quran/surahs";
import type { ProgressRecord } from "@/lib/types";

export type RecordWithErrors = ProgressRecord & {
  quran_error_records?: Array<{ id: string; error_type: string; surah: number | null; ayah: number | null; note: string | null }>;
  halaqat?: { name: string } | null;
};

const score = (v: number | null) => (v ? `${v}/5 (${SCORE_LABELS[v]})` : "—");

/** Shows the five signals separately — never merged into one score. */
export function ProgressList({
  records,
  renderActions,
  reactions,
}: {
  records: RecordWithErrors[];
  renderActions?: (r: RecordWithErrors) => ReactNode;
  /** When given, approved records show the encouragement reactions. */
  reactions?: Record<string, ReactionSummary>;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {records.map((r) => (
        <li key={r.id} className="surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-ink">{ACTIVITY[r.activity]}: {formatRange(r)}</p>
            <span className="flex gap-2">
              {r.status === "draft" && <Badge tone="gold">مسودة</Badge>}
              {r.revision > 1 && <Badge>معدَّل ({r.revision - 1})</Badge>}
              <Badge tone={r.completion === "completed" ? "green" : r.completion === "partial" ? "gold" : "red"}>{COMPLETION[r.completion]}</Badge>
            </span>
          </div>
          <p className="text-sm text-muted">{formatDate(r.recorded_on)}{r.halaqat?.name ? ` · ${r.halaqat.name}` : ""}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
            <div><dt className="text-muted">المقدار</dt><dd className="font-semibold">{r.ayah_count} آية</dd></div>
            <div><dt className="text-muted">الإتقان</dt><dd className="font-semibold">{score(r.mastery_score)}</dd></div>
            <div><dt className="text-muted">جودة التلاوة</dt><dd className="font-semibold">{score(r.recitation_score)}</dd></div>
            <div><dt className="text-muted">الالتزام بالخطة</dt><dd className="font-semibold">{ADHERENCE[r.plan_adherence]}</dd></div>
          </dl>
          {r.quran_error_records && r.quran_error_records.length > 0 && (
            <div className="mt-2">
              <p className="text-sm font-semibold">الأخطاء ({r.quran_error_records.length}):</p>
              <ul className="list-inside list-disc text-sm text-muted">
                {r.quran_error_records.map((e) => (
                  <li key={e.id}>
                    {ERROR_TYPE[e.error_type]}
                    {e.surah ? ` — ${getSurah(e.surah)?.name}${e.ayah ? ` ${e.ayah}` : ""}` : ""}
                    {e.note ? `: ${e.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {r.teacher_notes && <p className="mt-2 whitespace-pre-line text-ink">ملاحظات: {r.teacher_notes}</p>}
          {reactions && r.status === "approved" && <Reactions entityType="progress_record" entityId={r.id} summary={reactions[r.id]} />}
          {renderActions?.(r)}
        </li>
      ))}
    </ul>
  );
}
