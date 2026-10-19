import { deleteTaskAction, toggleTaskAction } from "@/app/dashboard/motivation-actions";
import { Icon } from "@/components/Icon";
import { Badge, cx } from "@/components/ui";
import { formatDate } from "@/lib/format";

export type PersonalTask = { id: string; title: string; due_on: string | null; priority: number; done_at: string | null };

const PRIORITY: Record<number, { label: string; tone: "red" | "gray" | "green" }> = {
  1: { label: "عالية", tone: "red" },
  2: { label: "عادية", tone: "gray" },
  3: { label: "منخفضة", tone: "green" },
};

export function TaskList({ tasks, today, allowDelete = true }: { tasks: PersonalTask[]; today: string; allowDelete?: boolean }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {tasks.map((t) => {
        const done = Boolean(t.done_at);
        const overdue = !done && t.due_on && t.due_on < today;
        return (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <form action={toggleTaskAction}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="done" value={done ? "0" : "1"} />
              <button
                type="submit"
                aria-pressed={done}
                aria-label={done ? `إلغاء إنجاز: ${t.title}` : `إنجاز: ${t.title}`}
                className={cx("grid size-7 place-items-center rounded-full border-2 transition-colors", done ? "border-brand-fill bg-brand-fill text-white" : "border-line-strong hover:border-brand-600")}
              >
                {done && <Icon name="check" size={16} />}
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <p className={cx("font-semibold", done && "text-muted line-through")}>{t.title}</p>
              {(t.due_on || t.priority !== 2) && (
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  {t.due_on && <span className={cx(overdue && "font-semibold text-danger")}>{overdue ? "متأخرة · " : ""}{formatDate(t.due_on)}</span>}
                  {t.priority !== 2 && <Badge tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Badge>}
                </p>
              )}
            </div>
            {allowDelete && (
              <form action={deleteTaskAction}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="icon-button" aria-label={`حذف: ${t.title}`}><Icon name="trash" size={18} /></button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
