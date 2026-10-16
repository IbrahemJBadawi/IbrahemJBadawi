import type { Metadata } from "next";
import Link from "next/link";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { staffHalaqat } from "@/lib/data/halaqat";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "البحث" };

export default async function SearchPage({ searchParams }: PageProps<"/dashboard/search">) {
  const user = await requireUser();
  const q = String((await searchParams).q ?? "").trim().slice(0, 80);
  const supabase = await createClient();

  type Hit = { href: string; title: string; meta: string };
  const groups: Array<{ label: string; hits: Hit[] }> = [];
  if (q.length >= 2) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const isTeacher = user.contexts.includes("quran_teacher");
    const [halaqat, teachers, tasks, staff] = await Promise.all([
      supabase.rpc("get_public_halaqat", { p_search: q, p_limit: 8 }),
      supabase.rpc("get_public_teachers", { p_search: q, p_limit: 8 }),
      supabase.from("personal_tasks").select("id, title, done_at").eq("user_id", user.id).ilike("title", like).limit(8),
      isTeacher ? staffHalaqat(supabase, user.id) : Promise.resolve({ rows: [] }),
    ]);
    const myHalaqaIds = staff.rows.map((m) => m.halaqa_id);
    const students = myHalaqaIds.length
      ? await supabase.from("halaqa_memberships").select("halaqa_id, user_id, profiles!halaqa_memberships_user_id_fkey(full_name, display_name)")
          .in("halaqa_id", myHalaqaIds).eq("role", "student").eq("status", "active").limit(300)
      : { data: [] };
    const studentHits = ((students.data ?? []) as unknown as Array<{ halaqa_id: string; user_id: string; profiles: { full_name: string; display_name: string | null } | null }>)
      .filter((s) => `${s.profiles?.full_name ?? ""} ${s.profiles?.display_name ?? ""}`.includes(q))
      .slice(0, 10)
      .map((s) => ({
        href: `/dashboard/teacher/halaqat/${s.halaqa_id}/students/${s.user_id}`,
        title: s.profiles?.display_name || s.profiles?.full_name || "طالب",
        meta: staff.rows.find((m) => m.halaqa_id === s.halaqa_id)?.halaqat?.name ?? "",
      }));
    const myHalaqat = staff.rows.filter((m) => m.halaqat?.name.includes(q)).map((m) => ({ href: `/dashboard/teacher/halaqat/${m.halaqa_id}`, title: m.halaqat!.name, meta: "حلقة تديرها" }));
    groups.push(
      { label: "طلابي", hits: studentHits },
      { label: "حلقاتي", hits: myHalaqat },
      { label: "الحلقات", hits: ((halaqat.data ?? []) as Array<{ id: string; name: string; teacher_name: string }>).map((h) => ({ href: `/halaqat/${h.id}`, title: h.name, meta: h.teacher_name })) },
      { label: "المحفّظون", hits: ((teachers.data ?? []) as Array<{ id: string; name: string; verified: boolean }>).map((t) => ({ href: `/teachers?q=${encodeURIComponent(t.name)}`, title: t.name, meta: t.verified ? "محفّظ موثّق ✓" : "محفّظ" })) },
      { label: "مهامي", hits: (tasks.data ?? []).map((t) => ({ href: "/dashboard/tasks", title: t.title, meta: t.done_at ? "منجزة" : "قيد الإنجاز" })) },
    );
  }
  const found = groups.filter((g) => g.hits.length > 0);
  return (
    <>
      <PageHeader title="البحث" />
      <form role="search" className="mb-4 flex gap-2" action="/dashboard/search">
        <label htmlFor="q" className="sr-only">ابحث</label>
        <input id="q" name="q" type="search" defaultValue={q} minLength={2} maxLength={80} placeholder="ابحث عن حلقة، محفّظ، طالب، أو مهمة…" className="input" autoFocus />
        <button type="submit" className="btn btn-primary">بحث</button>
      </form>
      {q.length < 2 ? <p className="text-muted">اكتب حرفين على الأقل.</p> : found.length === 0 ? <EmptyState title="لا نتائج">جرّب كلمة أخرى.</EmptyState> : (
        <div className="grid gap-4 md:grid-cols-2">
          {found.map((g) => (
            <Card key={g.label}>
              <h2 className="mb-2 font-bold text-brand-800">{g.label}</h2>
              <ul className="divide-y divide-line">
                {g.hits.map((h, i) => <li key={h.href + i}><Link href={h.href} className="flex justify-between gap-2 py-2 hover:text-brand-800"><span className="font-semibold">{h.title}</span><span className="text-sm text-muted">{h.meta}</span></Link></li>)}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
