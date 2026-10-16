import type { Metadata } from "next";
import { NotConfigured } from "@/components/NotConfigured";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Pagination } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { CONTEXT_LABELS, type AppRole } from "@/lib/roles";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "دليل المحفّظين والمعلمين" };
const PAGE_SIZE = 20;

type Teacher = { id: string; name: string; bio: string | null; roles: AppRole[]; published_halaqat: number; total_count: number };

export default async function TeachersPage({ searchParams }: PageProps<"/teachers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  let rows: Teacher[] = [];
  let failed = false;
  if (isSupabaseConfigured) {
    const { data, error } = await createPublicClient().rpc("get_public_teachers", {
      p_search: q || null, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE,
    });
    rows = (data ?? []) as Teacher[];
    failed = Boolean(error);
  }
  const total = Number(rows[0]?.total_count ?? 0);
  return (
    <>
      <PageHeader title="دليل المحفّظين والمعلمين" description="يظهر هنا من اختار إظهار ملفه في الدليل العام." />
      <form role="search" className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">بحث بالاسم</label>
        <Input name="q" defaultValue={q} placeholder="ابحث بالاسم" />
        <Button type="submit">بحث</Button>
      </form>
      {!isSupabaseConfigured ? <NotConfigured /> : failed ? (
        <Alert tone="error">تعذّر تحميل الدليل حاليًا.</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد نتائج" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((t) => (
              <Card key={t.id} className="flex flex-col gap-2">
                <h2 className="text-lg font-bold text-brand-900">{t.name}</h2>
                <div className="flex flex-wrap gap-2">{t.roles.map((r) => <Badge key={r} tone="green">{CONTEXT_LABELS[r]}</Badge>)}</div>
                {t.bio && <p className="line-clamp-4 text-muted">{t.bio}</p>}
                <p className="text-sm text-muted">{t.published_halaqat} حلقة منشورة</p>
              </Card>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/teachers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
        </>
      )}
    </>
  );
}
