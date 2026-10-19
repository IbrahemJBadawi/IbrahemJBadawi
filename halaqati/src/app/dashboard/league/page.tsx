import { ExportBar } from "@/components/export/ExportBar";
import type { Metadata } from "next";
import Link from "next/link";
import { setLeagueVisibilityAction } from "@/app/dashboard/motivation-actions";
import { LeagueTable } from "@/components/motivation/LeagueTable";
import { Alert, Button, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import type { LeagueRow } from "@/lib/data/motivation";
import { viewerHalaqat } from "@/lib/data/halaqat";
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

  const [halaqat, { data: profile }] = await Promise.all([
    viewerHalaqat(supabase, user.id),
    supabase.from("profiles").select("league_visible").eq("id", user.id).single(),
  ]);
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
          {selected && <ExportBar type="league" id={selected.id} fileName={`دوري-${selected.name}`} />}
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
