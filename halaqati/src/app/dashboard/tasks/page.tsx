import type { Metadata } from "next";
import { TaskForm } from "@/components/motivation/Forms";
import { TaskList, type PersonalTask } from "@/components/motivation/TaskList";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayUtc } from "@/lib/time";

export const metadata: Metadata = { title: "مهامي" };

export default async function TasksPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [open, done] = await Promise.all([
    supabase.from("personal_tasks").select("id, title, due_on, priority, done_at").eq("user_id", user.id).is("done_at", null)
      .order("priority").order("due_on", { ascending: true, nullsFirst: false }).order("created_at").limit(200),
    supabase.from("personal_tasks").select("id, title, due_on, priority, done_at").eq("user_id", user.id).not("done_at", "is", null)
      .order("done_at", { ascending: false }).limit(30),
  ]);
  const openTasks = (open.data ?? []) as PersonalTask[];
  const doneTasks = (done.data ?? []) as PersonalTask[];
  const today = todayUtc();
  return (
    <>
      <PageHeader title="مهامي" description="مهامك الشخصية — خاصة بك وحدك. كل مهمة تنجزها تمنحك نقطتين (حتى 10 نقاط يوميًا)." />
      <div className="flex flex-col gap-4">
        <Card><TaskForm /></Card>
        <Card>
          <h2 className="mb-1 font-bold text-brand-800">قيد الإنجاز ({openTasks.length})</h2>
          {openTasks.length ? <TaskList tasks={openTasks} today={today} /> : <EmptyState title="لا مهام مفتوحة">أضف مهمة من الأعلى.</EmptyState>}
        </Card>
        {doneTasks.length > 0 && (
          <Card>
            <h2 className="mb-1 font-bold text-muted">أُنجزت مؤخرًا</h2>
            <TaskList tasks={doneTasks} today={today} />
          </Card>
        )}
      </div>
    </>
  );
}
