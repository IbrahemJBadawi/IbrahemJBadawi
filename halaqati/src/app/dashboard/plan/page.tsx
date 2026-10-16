import type { Metadata } from "next";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { ACTIVITY, ASSIGNMENT_STATUS } from "@/lib/labels";
import { formatRange } from "@/lib/quran/surahs";
import { createClient } from "@/lib/supabase/server";
import type { Assignment } from "@/lib/types";

export const metadata: Metadata = { title: "خطتي وواجباتي" };

export default async function PlanPage() {
  const user = await requireContext("student");
  const supabase = await createClient();
  const { data } = await supabase
    .from("quran_assignments")
    .select("*, halaqat(name)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(40);
  const rows = (data ?? []) as Row[];
  const open = rows.filter((a) => a.status === "assigned");
  const done = rows.filter((a) => a.status !== "assigned");
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="خطتي وواجباتي" description="الحفظ والمراجعة المطلوبة منك كما حدّدها المحفّظ." />
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">المطلوب الآن</h2>
        {open.length === 0 ? <p className="text-muted">لا توجد واجبات مفتوحة.</p> : <ul className="divide-y divide-line">{open.map((a) => <AssignmentItem key={a.id} a={a} />)}</ul>}
      </Card>
      <Card>
        <h2 className="mb-2 text-lg font-bold text-brand-800">السابق</h2>
        {done.length === 0 ? <EmptyState title="لا يوجد سجل بعد" /> : <ul className="divide-y divide-line">{done.map((a) => <AssignmentItem key={a.id} a={a} />)}</ul>}
      </Card>
    </div>
  );
}

type Row = Assignment & { halaqat: { name: string } | null };

function AssignmentItem({ a }: { a: Row }) {
  return (
    <li className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{ACTIVITY[a.activity]}: {formatRange(a)} <span className="text-sm text-muted">({a.ayah_count} آية)</span></p>
        <p className="text-sm text-muted">{a.halaqat?.name}{a.due_on ? ` · الموعد ${formatDate(a.due_on)}` : ""}</p>
        {a.instructions && <p className="text-muted">{a.instructions}</p>}
      </div>
      <Badge tone={a.status === "completed" ? "green" : a.status === "assigned" ? "gold" : "gray"}>{ASSIGNMENT_STATUS[a.status]}</Badge>
    </li>
  );
}
