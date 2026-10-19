import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BarChart, weekLabel } from "@/components/motivation/BarChart";
import { Alert, Card, PageHeader, Stat } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { loadHalaqaForStaff } from "@/lib/data/staff";
import { percent } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "إحصائيات الحلقة" };

type Week = { week: string; sessions: number; attended: number; marked: number; new_ayat: number; records: number };

export default async function HalaqaStatsPage({ params }: PageProps<"/dashboard/teacher/halaqat/[id]/stats">) {
  const user = await requireContext("quran_teacher");
  const { id } = await params;
  const supabase = await createClient();
  const loaded = await loadHalaqaForStaff(supabase, user, id);
  if (!loaded) notFound();
  const { data, error } = await supabase.rpc("get_halaqa_stats", { p_halaqa: id, p_weeks: 12 });
  const stats = data as { active_students: number; weeks: Week[] } | null;
  const weeks = stats?.weeks ?? [];
  const sum = (k: keyof Omit<Week, "week">) => weeks.reduce((a, w) => a + Number(w[k]), 0);
  const series = (pick: (w: Week) => number, unit: string) =>
    weeks.map((w) => ({ key: w.week, label: weekLabel(w.week), value: pick(w), tip: `أسبوع ${weekLabel(w.week)}: ${pick(w)} ${unit}` }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="إحصائيات الحلقة" description={<><Link href={`/dashboard/teacher/halaqat/${id}`} className="font-semibold underline">{loaded.halaqa.name}</Link> · آخر 12 أسبوعًا</>} />
      {error || !stats ? <Alert tone="error">تعذّر تحميل الإحصائيات.</Alert> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="الطلاب النشطون" value={stats.active_students} />
            <Stat label="الجلسات" value={sum("sessions")} />
            <Stat label="نسبة الحضور" value={sum("marked") ? `${percent(sum("attended"), sum("marked"))}%` : "—"} hint="حاضر أو متأخر من المسجَّل" />
            <Stat label="حفظ جديد معتمد" value={`${sum("new_ayat")} آية`} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><BarChart title="الحفظ الجديد أسبوعيًا (آية)" unit="آية" data={series((w) => w.new_ayat, "آية")} /></Card>
            <Card><BarChart title="نسبة الحضور أسبوعيًا (%)" unit="%" data={series((w) => percent(w.attended, w.marked), "%")} /></Card>
            <Card><BarChart title="التسميعات المعتمدة أسبوعيًا" unit="تسميع" data={series((w) => w.records, "تسميع")} /></Card>
            <Card><BarChart title="الجلسات أسبوعيًا" unit="جلسة" data={series((w) => w.sessions, "جلسة")} /></Card>
          </div>
        </>
      )}
    </div>
  );
}
