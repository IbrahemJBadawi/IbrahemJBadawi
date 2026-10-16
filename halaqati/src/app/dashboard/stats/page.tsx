import type { Metadata } from "next";
import Link from "next/link";
import { StudentStatsView, type WeekStat } from "@/components/motivation/StudentStatsView";
import { Alert, EmptyState, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "الإحصائيات" };

export default async function StatsPage({ searchParams }: PageProps<"/dashboard/stats">) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id, profiles!parent_student_links_student_id_fkey(full_name, display_name)")
    .eq("parent_id", user.id)
    .eq("status", "active")
    .limit(50);
  const kids = ((links ?? []) as unknown as Array<{ student_id: string; profiles: { full_name: string; display_name: string | null } | null }>).map((l) => ({
    id: l.student_id,
    name: l.profiles?.display_name || l.profiles?.full_name || "ابني",
  }));
  const people = [...(user.roles.includes("student") ? [{ id: user.id, name: "أنا" }] : []), ...kids];
  const who = people.find((p) => p.id === sp.s) ?? people[0];
  const weeksParam = Number(sp.w) === 26 ? 26 : 12;

  if (!who) {
    return (
      <>
        <PageHeader title="الإحصائيات" />
        <EmptyState title="لا توجد إحصائيات لعرضها">الإحصائيات متاحة للطلاب ولأولياء الأمور المرتبطين بأبنائهم.</EmptyState>
      </>
    );
  }
  const { data, error } = await supabase.rpc("get_student_stats", { p_student: who.id, p_weeks: weeksParam });
  const weeks = (data ?? []) as WeekStat[];
  const href = (s: string, w: number) => `/dashboard/stats?s=${s}&w=${w}`;

  return (
    <>
      <PageHeader title="الإحصائيات" description="من السجلات المعتمدة فقط — كل مقياس في رسم مستقل." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {people.length > 1 && people.map((p) => (
          <Link key={p.id} href={href(p.id, weeksParam)} aria-current={p.id === who.id ? "page" : undefined} className={cx("btn !min-h-9 !px-3 text-sm", p.id === who.id ? "btn-primary" : "btn-secondary")}>{p.name}</Link>
        ))}
        <div className="ms-auto flex rounded-full bg-deep p-1" role="group" aria-label="المدة">
          {[12, 26].map((w) => (
            <Link key={w} href={href(who.id, w)} aria-current={w === weeksParam ? "true" : undefined} className={cx("rounded-full px-3 py-1.5 text-sm font-semibold", w === weeksParam ? "bg-panel text-brand-900 shadow-sm" : "text-muted")}>{w === 12 ? "3 أشهر" : "6 أشهر"}</Link>
          ))}
        </div>
      </div>
      {error ? <Alert tone="error">تعذّر تحميل الإحصائيات.</Alert> : <StudentStatsView weeks={weeks} />}
    </>
  );
}
