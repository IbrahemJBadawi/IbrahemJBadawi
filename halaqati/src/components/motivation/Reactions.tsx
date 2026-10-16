import { toggleReactionAction } from "@/app/dashboard/motivation-actions";
import { cx } from "@/components/ui";
import { REACTION_KINDS, REACTION_LABELS, type ReactionSummary } from "@/lib/data/motivation";

/** Encouragement reactions («التفاعلات») — each is a real toggle stored per user. */
export function Reactions({ entityType, entityId, summary }: { entityType: "progress_record" | "certificate"; entityId: string; summary?: ReactionSummary }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="التفاعلات">
      {REACTION_KINDS.map((k) => {
        const s = summary?.[k];
        const { emoji, label } = REACTION_LABELS[k];
        return (
          <form key={k} action={toggleReactionAction}>
            <input type="hidden" name="entity_type" value={entityType} />
            <input type="hidden" name="entity_id" value={entityId} />
            <input type="hidden" name="kind" value={k} />
            <button
              type="submit"
              aria-pressed={Boolean(s?.mine)}
              title={label}
              aria-label={`${label}${s?.count ? ` (${s.count})` : ""}`}
              className={cx(
                "inline-flex min-h-9 items-center gap-1 rounded-full border px-2.5 text-sm transition-colors",
                s?.mine ? "border-brand-600/50 bg-brand-100 font-semibold text-brand-900" : "border-line bg-panel text-muted hover:bg-brand-50",
              )}
            >
              <span aria-hidden>{emoji}</span>
              <span className="hidden sm:inline">{label}</span>
              {s?.count ? <span className="tabular-nums">{s.count}</span> : null}
            </button>
          </form>
        );
      })}
    </div>
  );
}
