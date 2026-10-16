import type { Metadata } from "next";
import Link from "next/link";
import { setLeagueVisibilityAction } from "@/app/dashboard/motivation-actions";
import { LeagueTable } from "@/components/motivation/LeagueTable";
import { Alert, Button, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { LeagueRow } from "@/lib/data/motivation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "الدوري" };

const PERIODS = [
  { key: "week", label: "هذا الأسبوع" },
  { key: "month", label: "هذا الشهر" },
  { key: "all", label: "منذ البداية" },
] as const;
type Period = (typeof PERIODS)[number]["key"];

export default async function LeaguePage({ searchParams }: PageProps<"/dashboard/league">) {
  const user = await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();

  // Halaqat the viewer may see a league for: as student, staff, or parent of a student.
  const [{ data: own }, { data: kids }, { data: profile }] = await Promise.all([
    supabase.from("halaqa_memberships").select("halaqa_id, role, halaqat(id, name, league_enabled)").eq("user_id", user.id).eq("status", "active").limit(100),
    supabase.from("parent_student_links").select("student_id").eq("parent_id", user.id).eq("status", "active").limit(50),
    supabase.from("profiles").select("league_visible").eq("id", user.id).single(),
  ]);
  type H = { id: string; name: string; league_enabled: boolean };
  const map = new Map<string, H>();
  for (const m of (own ?? []) as unknown as Array<{ halaqat: H | null }>) if (m.halaqat) map.set(m.halaqat.id, m.halaqat);
  const kidIds = (kids ?? []).map((k) => k.student_id);
  if (kidIds.length) {
    const { data } = await supabase.from("halaqa_memberships").select("halaqat(id, name, league_enabled)").in("user_id", kidIds).eq("role", "student").eq("status", "active").limit(100);
    for (const m of (data ?? []) as unknown as Array<{ halaqat: H | null }>) if (m.halaqat) map.set(m.halaqat.id, m.halaqat);
  }
  const halaqat = [...map.values()];
  const selected = halaqat.find((h) => h.id === sp.h) ?? halaqat[0];
  const period: Period = PERIODS.some((p) => p.key === sp.p) ? (sp.p as Period) : "week";
  const href = (h: string, p: Period) => `/dashboard/league?h=${h}&p=${p}`;

  let rows: LeagueRow[] = [];
  let error: string | null = null;
  if (selected) {
    const res = await supabase.rpc("get_halaqa_league", { p_halaqa: selected.id, p_period: period });
    rows = (res.data ?? []) as LeagueRow[];
    if (res.error) error = "تعذّر تحميل الدوري.";
  }
  const visible = profile?.league_visible ?? true;

  return (
    <>
      <PageHeader title="الدوري" description="ترتيب طلاب الحلقة بالنقاط — يراه أعضاء الحلقة ومعلّموها وأولياء الأمور فقط." />
      {halaqat.length === 0 ? (
        <EmptyState title="لا يوجد دوري بعد">انضم إلى حلقة لتشارك في دوريها. <Link href="/halaqat" className="font-semibold underline">ابحث عن حلقة</Link></EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {halaqat.length > 1 && (
            <nav aria-label="اختر الحلقة" className="flex flex-wrap gap-2">
              {halaqat.map((h) => (
                <Link key={h.id} href={href(h.id, period)} aria-current={h.id === selected?.id ? "page" : undefined} className={cx("btn !min-h-9 !px-3 text-sm", h.id === selected?.id ? "btn-primary" : "btn-secondary")}>{h.name}</Link>
              ))}
            </nav>
          )}
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold text-brand-800">{selected?.name}</h2>
              <div className="flex rounded-full bg-deep p-1" role="group" aria-label="الفترة">
                {PERIODS.map((p) => (
                  <Link key={p.key} href={href(selected!.id, p.key)} aria-current={p.key === period ? "true" : undefined} className={cx("rounded-full px-3 py-1.5 text-sm font-semibold", p.key === period ? "bg-panel text-brand-900 shadow-sm" : "text-muted")}>{p.label}</Link>
                ))}
              </div>
            </div>
            {error ? <Alert tone="error">{error}</Alert> : rows.length ? <LeagueTable rows={rows} /> : <p className="text-muted">{selected?.league_enabled ? "لا يوجد طلاب في الدوري بعد." : "أوقف المعلّم الدوري في هذه الحلقة."}</p>}
          </Card>
          {user.roles.includes("student") && (
            <Card className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">ظهور اسمي في الدوري</p>
                <p className="text-sm text-muted">{visible ? "يظهر اسمك لزملائك في الحلقة." : "يظهر اسمك لزملائك «مشارك» فقط. المعلّم ووليّ أمرك يرونه دائمًا."}</p>
              </div>
              <form action={setLeagueVisibilityAction}>
                <input type="hidden" name="visible" value={visible ? "0" : "1"} />
                <Button type="submit" variant="secondary">{visible ? "إخفاء اسمي" : "إظهار اسمي"}</Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
