import Link from "next/link";
import { ButtonLink, Card, EmptyState } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { myChildren } from "@/lib/data/children";
import { personName } from "@/lib/data/halaqat";
import { createClient } from "@/lib/supabase/server";
import type { StudentOverview } from "@/lib/types";
import { SummaryChips } from "@/components/motivation/SummaryChips";
import { studentSummary } from "@/lib/data/summary";
import { TasksPreview } from "@/components/motivation/HomeWidgets";
import { BarChart, weekLabel } from "@/components/motivation/BarChart";

export async function ParentHome({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const { rows } = await myChildren(supabase, user.id);
  const [overviews, summaries, weekly] = await Promise.all([
    Promise.all(rows.map(async (c) => (await supabase.rpc("get_student_overview", { p_student: c.student_id, p_days: 30 })).data as StudentOverview | null)),
    Promise.all(rows.map((c) => studentSummary(supabase, c.student_id, false))),
    Promise.all(rows.map(async (c) => ((await supabase.rpc("get_student_stats", { p_student: c.student_id, p_weeks: 8 })).data ?? []) as Array<{ week: string; points: number }>)),
  ]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-brand-900">لوحة وليّ الأمر</h2>
        <ButtonLink href="/dashboard/children" variant="secondary">ربط ابن جديد</ButtonLink>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="لا يوجد أبناء مرتبطون بحسابك">
          اطلب من ابنك إنشاء «رمز ربط وليّ الأمر» من صفحة حسابه، ثم أدخله في صفحة <Link href="/dashboard/children" className="font-semibold underline">الأبناء</Link>.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {rows.map((c, i) => {
            const o = overviews[i];
            return (
              <Card key={c.id} className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-brand-900">{personName(c.profiles)}</h2>
                {summaries[i] && <SummaryChips s={summaries[i]} />}
                {weekly[i].length > 0 && (
                  <BarChart title="النقاط أسبوعيًا" unit="نقطة" height={100}
                    data={weekly[i].map((w) => ({ key: w.week, label: weekLabel(w.week), value: Number(w.points), tip: `أسبوع ${weekLabel(w.week)}: ${w.points} نقطة` }))} />
                )}
                {o ? (
                  <ul className="text-sm text-muted">
                    <li>الحفظ المعتمد: <span className="font-semibold text-ink">{o.amount.new_memorization_ayat} آية</span></li>
                    <li>المراجعة خلال 30 يومًا: <span className="font-semibold text-ink">{o.amount.review_ayat_period} آية</span></li>
                    <li>متوسط الإتقان: <span className="font-semibold text-ink">{o.mastery_avg ?? "—"}</span></li>
                    <li>الحضور: <span className="font-semibold text-ink">{o.attendance.present ?? 0}</span> · الغياب: <span className="font-semibold text-ink">{o.attendance.absent ?? 0}</span></li>
                  </ul>
                ) : (
                  <p className="text-sm text-muted">لا تتوفر بيانات بعد.</p>
                )}
                <Link href={`/dashboard/children/${c.student_id}`} className="font-semibold text-brand-800 underline">التفاصيل</Link>
              </Card>
            );
          })}
        </div>
      )}
      <TasksPreview supabase={supabase} userId={user.id} />
    </div>
  );
}
