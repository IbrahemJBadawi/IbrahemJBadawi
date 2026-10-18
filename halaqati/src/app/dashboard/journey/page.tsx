import { ExportBar } from "@/components/export/ExportBar";
import type { Metadata } from "next";
import { OverviewStats } from "@/components/OverviewStats";
import { ProgressList, type RecordWithErrors } from "@/components/ProgressList";
import { EmptyState, PageHeader, Pagination } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { loadReactions } from "@/lib/data/motivation";
import { createClient } from "@/lib/supabase/server";
import type { StudentOverview } from "@/lib/types";

export const metadata: Metadata = { title: "رحلتي القرآنية" };
const PAGE_SIZE = 15;

export default async function JourneyPage({ searchParams }: PageProps<"/dashboard/journey">) {
  const user = await requireContext("student");
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  const [overviewRes, recordsRes] = await Promise.all([
    supabase.rpc("get_student_overview", { p_student: user.id, p_days: 30 }),
    supabase
      .from("quran_progress_records")
      .select("*, quran_error_records(id, error_type, surah, ayah, note), halaqat(name)", { count: "exact" })
      .eq("student_id", user.id)
      .order("recorded_on", { ascending: false })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ]);
  const o = overviewRes.data as StudentOverview | null;
  const records = (recordsRes.data ?? []) as RecordWithErrors[];
  const reactions = await loadReactions(supabase, "progress_record", records.map((r) => r.id), user.id);
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="رحلتي القرآنية" description="كل مؤشر يُقاس منفصلًا: المقدار، والإتقان، وجودة التلاوة، والالتزام، والحضور." />
      <ExportBar type="records" fileName="رحلتي-القرآنية" />
      {o && <OverviewStats o={o} />}
      <section>
        <h2 className="mb-3 text-lg font-bold text-brand-800">سجل التسميع المعتمد</h2>
        {records.length === 0 ? <EmptyState title="لا توجد سجلات معتمدة بعد">ستظهر هنا بعد أن يعتمد المحفّظ تسميعك.</EmptyState> : <ProgressList records={records} reactions={reactions} />}
        <Pagination page={page} pageSize={PAGE_SIZE} total={recordsRes.count ?? 0} hrefFor={(p) => `/dashboard/journey?page=${p}`} />
      </section>
    </div>
  );
}
