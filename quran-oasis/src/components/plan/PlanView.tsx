"use client";

import { ArrowDown, ArrowUp, BarChart3, Bell, ListChecks, NotebookPen, Plus, Sparkles, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Dhikr, DhikrCategory, DhikrCategoryId } from "@/content/adhkar";
import { GoalDialog } from "@/components/dashboard/GoalDialog";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Form";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/Toast";
import { addTask, removeTask, updateSettings, updateTask } from "@/lib/store/actions";
import { formatAmount, goalProgress } from "@/lib/store/progress";
import { useHydrated, useStore } from "@/lib/store/store";
import { TASK_CATALOG } from "@/lib/tasks";
import { KhatmaCard } from "./KhatmaCard";
import { ManualLog } from "./ManualLog";
import { TaskList, useActiveTasks } from "./TaskList";
import { WeekChart } from "./WeekChart";

function TaskManager() {
  const toast = useToast();
  const tasks = useStore((s) => s.tasks);
  const [custom, setCustom] = useState("");
  const list = useMemo(() => Object.values(tasks).filter((t) => !t.deleted).sort((a, b) => a.order - b.order), [tasks]);
  const has = (type: string) => list.find((t) => t.type === type && t.active);

  const move = (id: string, dir: -1 | 1) => {
    const active = list.filter((t) => t.active);
    const i = active.findIndex((t) => t.id === id);
    const j = i + dir;
    if (j < 0 || j >= active.length) return;
    updateTask(active[i].id, { order: active[j].order });
    updateTask(active[j].id, { order: active[i].order });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold">اختر مهامك اليومية</p>
        <div className="flex flex-wrap gap-2">
          {TASK_CATALOG.map((t) => {
            const on = !!has(t.type);
            return (
              <button
                key={t.type}
                type="button"
                aria-pressed={on}
                title={t.description}
                onClick={() => {
                  const existing = has(t.type);
                  if (existing) removeTask(existing.id);
                  else addTask(t.type, t.title);
                }}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-ring",
                  on ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:border-accent",
                )}
              >
                {on ? "✓ " : "+ "}
                {t.title}
              </button>
            );
          })}
        </div>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = custom.trim();
          if (!v) return;
          addTask("custom", v);
          setCustom("");
          toast("أُضيفت المهمة");
        }}
      >
        <label htmlFor="custom-task" className="sr-only">
          مهمة مخصصة
        </label>
        <Input id="custom-task" value={custom} maxLength={120} onChange={(e) => setCustom(e.target.value)} placeholder="مهمة مخصصة، مثل: قراءة سورة الملك قبل النوم" />
        <Button type="submit" variant="secondary" disabled={!custom.trim()} aria-label="إضافة مهمة">
          <Plus className="h-5 w-5" />
        </Button>
      </form>

      {list.some((t) => t.active) && (
        <div>
          <p className="mb-2 text-sm font-semibold">ترتيب المهام</p>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {list
              .filter((t) => t.active)
              .map((t, i, arr) => (
                <li key={t.id} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-sm font-semibold">{t.title}</span>
                  <button type="button" disabled={i === 0} onClick={() => move(t.id, -1)} className="rounded-full p-2 text-muted hover:bg-surface-2 disabled:opacity-30 focus-ring" aria-label={`نقل ${t.title} للأعلى`}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={i === arr.length - 1} onClick={() => move(t.id, 1)} className="rounded-full p-2 text-muted hover:bg-surface-2 disabled:opacity-30 focus-ring" aria-label={`نقل ${t.title} للأسفل`}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => removeTask(t.id)} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-danger focus-ring" aria-label={`حذف ${t.title}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function PlanView({ adhkar, categories }: { adhkar: Dhikr[]; categories: DhikrCategory[] }) {
  const hydrated = useHydrated();
  const settings = useStore((s) => s.settings);
  const readingLog = useStore((s) => s.readingLog);
  const [goalOpen, setGoalOpen] = useState(false);
  const tasks = useActiveTasks();
  const goal = useMemo(() => goalProgress({ readingLog, settings }), [readingLog, settings]);

  if (!hydrated) return <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface-2" />;

  const toggleTracked = (id: DhikrCategoryId) => {
    const cur = settings.trackedAdhkar;
    updateSettings({ trackedAdhkar: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardTitle
          icon={<Target className="h-5 w-5" />}
          action={
            <Button size="sm" variant="secondary" onClick={() => setGoalOpen(true)}>
              تعديل
            </Button>
          }
        >
          الهدف اليومي للقراءة
        </CardTitle>
        {goal.enabled ? (
          <p className="text-[15px]">
            هدفك: <strong>{goal.target}</strong> {goal.unit === "pages" ? "صفحة" : "آية"} يوميًا. قرأت اليوم{" "}
            <strong>{formatAmount(goal.done)}</strong>.
          </p>
        ) : (
          <p className="text-muted">الهدف اليومي غير مفعّل. يمكنك القراءة بحرية دون هدف محدد.</p>
        )}
        <div className="mt-5">
          <WeekChart />
        </div>
      </Card>

      <KhatmaCard />

      <Card>
        <CardTitle icon={<ListChecks className="h-5 w-5" />}>مهام اليوم</CardTitle>
        {tasks.length ? <TaskList adhkar={adhkar} /> : <p className="text-sm text-muted">لم تختر مهامًا بعد. اختر من القائمة أدناه.</p>}
        <hr className="my-5 border-line" />
        <TaskManager />
      </Card>

      <div className="space-y-5">
        <Card>
          <CardTitle icon={<Sparkles className="h-5 w-5" />}>الأذكار التي أتابعها</CardTitle>
          <p className="mb-3 text-sm text-muted">تظهر في لوحة «اليوم» مع حالة إنجازها.</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => {
              const on = settings.trackedAdhkar.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleTracked(c.id)}
                  className={cn(
                    "h-10 rounded-full border px-4 text-sm font-semibold focus-ring",
                    on ? "border-primary bg-primary text-primary-fg" : "border-line bg-surface hover:border-accent",
                  )}
                >
                  {on ? "✓ " : ""}
                  {c.title}
                </button>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardTitle icon={<NotebookPen className="h-5 w-5" />}>تسجيل قراءة يدويًا</CardTitle>
          <p className="mb-3 text-sm text-muted">إن قرأت من مصحف ورقي، سجّل ما قرأته ليُحسب في وردك وختمتك.</p>
          <ManualLog />
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <Bell className="h-5 w-5 text-accent" aria-hidden="true" />
            التذكيرات {settings.reminders.enabled ? "مفعّلة" : "غير مفعّلة"} — لا نرسل أي تذكير دون موافقتك.
          </p>
          <Link href="/profile#reminders" className="text-sm font-semibold text-accent focus-ring rounded">
            إعداد التذكيرات
          </Link>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <BarChart3 className="h-5 w-5 text-accent" aria-hidden="true" />
            تقدّمك لك وحدك، دون مقارنة بأحد.
          </p>
          <Link href="/stats" className="text-sm font-semibold text-accent focus-ring rounded">
            عرض الإنجازات
          </Link>
        </Card>
      </div>
      <GoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} />
    </div>
  );
}
