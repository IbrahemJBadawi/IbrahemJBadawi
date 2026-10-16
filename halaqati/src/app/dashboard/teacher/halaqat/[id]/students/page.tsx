import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { loadHalaqaForStaff } from "@/lib/data/staff";
import { formatDate, percent } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "جدول الطلاب" };

type Row = {
  student_id: string; name: string; joined_at: string | null;
  sessions_marked: number; sessions_attended: number;
  memorized_ayat: number; reviewed_ayat_period: number;
  mastery_avg: number | null; recitation_avg: number | null;
  last_recorded_on: string | null; open_assignment: string | null; open_assignment_due: string | null;
};

export default async function StudentsTablePage({ params }: PageProps<"/dashboard/teacher/halaqat/[id]/students">) {
  const user = await requireContext("quran_teacher");
  const { id } = await params;
  const supabase = await createClient();
  const loaded = await loadHalaqaForStaff(supabase, user, id);
  if (!loaded) notFound();
  const { data, error } = await supabase.rpc("get_halaqa_student_table", { p_halaqa: id, p_days: 30 });
  const rows = (data ?? []) as Row[];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="جدول الطلاب"
        description={<><Link href={`/dashboard/teacher/halaqat/${id}`} className="underline">{loaded.halaqa.name}</Link> · مؤشرات آخر 30 يومًا (الحفظ المعتمد إجمالي)</>}
      />
      {error && <Alert tone="error">تعذّر تحميل الجدول.</Alert>}
      {rows.length === 0 ? <EmptyState title="لا يوجد طلاب نشطون" /> : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">طلاب الحلقة ومؤشراتهم</caption>
              <thead className="bg-brand-50 text-right text-brand-900">
                <tr>
                  <th scope="col" className="sticky right-0 bg-brand-50 p-3">الطالب</th>
                  <th scope="col" className="p-3">الحضور</th>
                  <th scope="col" className="p-3">الحفظ المعتمد</th>
                  <th scope="col" className="p-3">المراجعة</th>
                  <th scope="col" className="p-3">الإتقان</th>
                  <th scope="col" className="p-3">التلاوة</th>
                  <th scope="col" className="p-3">آخر تسميع</th>
                  <th scope="col" className="p-3">الواجب القادم</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const att = Number(r.sessions_marked) ? percent(Number(r.sessions_attended), Number(r.sessions_marked)) : null;
                  return (
                    <tr key={r.student_id} className="border-t border-line">
                      <th scope="row" className="sticky right-0 bg-white p-3 text-right font-semibold">
                        <Link href={`/dashboard/teacher/halaqat/${id}/students/${r.student_id}`} className="text-brand-900 underline">{r.name}</Link>
                      </th>
                      <td className={`p-3 ${att !== null && att < 60 ? "font-bold text-danger" : ""}`}>{att === null ? "—" : `${att}% (${r.sessions_attended}/${r.sessions_marked})`}</td>
                      <td className="p-3">{r.memorized_ayat} آية</td>
                      <td className="p-3">{r.reviewed_ayat_period} آية</td>
                      <td className="p-3">{r.mastery_avg ?? "—"}</td>
                      <td className="p-3">{r.recitation_avg ?? "—"}</td>
                      <td className="p-3">{r.last_recorded_on ? formatDate(r.last_recorded_on) : "—"}</td>
                      <td className="p-3">{r.open_assignment ? <>{r.open_assignment}{r.open_assignment_due && <span className="block text-xs text-muted">{formatDate(r.open_assignment_due)}</span>}</> : <span className="text-muted">لا يوجد</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="text-sm text-muted">نسبة الحضور الأقل من 60% تظهر باللون الأحمر. اسحب الجدول أفقيًا على الهاتف.</p>
    </div>
  );
}
