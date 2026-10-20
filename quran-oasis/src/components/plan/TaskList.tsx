"use client";

import { Check, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { cn } from "@/components/ui/cn";
import { dayKey } from "@/lib/date";
import { markTask } from "@/lib/store/actions";
import { taskStatus, type DhikrLite } from "@/lib/store/progress";
import { useStore } from "@/lib/store/store";
import { taskHref } from "@/lib/tasks";

export function useActiveTasks() {
  const tasks = useStore((s) => s.tasks);
  return useMemo(
    () => Object.values(tasks).filter((t) => !t.deleted && t.active).sort((a, b) => a.order - b.order),
    [tasks],
  );
}

export function TaskList({ adhkar, day = dayKey() }: { adhkar: DhikrLite[]; day?: string }) {
  const tasks = useActiveTasks();
  // نعيد الحساب عند تغيّر أي جزء من الحالة يؤثر على الإنجاز
  const state = useStore((s) => s);
  const items = useMemo(
    () => tasks.map((t) => ({ task: t, status: taskStatus(t, state, adhkar, day) })),
    [tasks, state, adhkar, day],
  );
  const doneCount = items.filter((i) => i.status.done).length;

  return (
    <div>
      <p className="mb-2 text-sm text-muted" aria-live="polite">
        أنجزت {doneCount} من {items.length}
      </p>
      <ul className="space-y-2">
        {items.map(({ task, status }) => {
          const href = taskHref(task.type);
          return (
            <li key={task.id} className={cn("flex items-center gap-3 rounded-2xl border px-3 py-2.5", status.done ? "border-transparent bg-accent-soft" : "border-line bg-surface")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={status.done}
                aria-label={task.title}
                onClick={() => markTask(task.id, !status.done, day)}
                className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors focus-ring",
                  status.done ? "border-success bg-success text-white" : "border-line text-transparent hover:border-accent",
                )}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("font-semibold", status.done && "text-muted line-through decoration-1")}>{task.title}</p>
                <p className="text-xs text-muted">
                  {status.done ? (status.auto ? "اكتملت تلقائيًا" : "أُنجزت") : (status.detail ?? "لم تُنجز بعد")}
                  {status.done && status.detail ? ` · ${status.detail}` : ""}
                </p>
              </div>
              {href && !status.done && (
                <Link href={href} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2 focus-ring" aria-label={`الانتقال إلى ${task.title}`}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
