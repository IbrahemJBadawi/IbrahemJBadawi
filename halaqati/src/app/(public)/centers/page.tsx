import type { Metadata } from "next";
import { NotConfigured } from "@/components/NotConfigured";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Pagination } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "دليل الدور والمراكز الموثقة" };
const PAGE_SIZE = 20;

type Center = { id: string; name: string; description: string | null; city: string | null; country: string | null; organization_name: string | null; total_count: number };

export default async function CentersPage({ searchParams }: PageProps<"/centers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  let rows: Center[] = [];
  let failed = false;
  if (isSupabaseConfigured) {
    const { data, error } = await createPublicClient().rpc("get_public_centers", {
      p_search: q || null, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE,
    });
    rows = (data ?? []) as Center[];
    failed = Boolean(error);
  }
  const total = Number(rows[0]?.total_count ?? 0);
  return (
    <>
      <PageHeader title="الدور والمراكز الموثقة" description="لا يظهر هنا إلا ما راجعته إدارة المنصة ووثّقته." />
      <form role="search" className="mb-6 flex gap-2">
        <label htmlFor="q" className="sr-only">بحث</label>
        <Input name="q" defaultValue={q} placeholder="ابحث بالاسم أو المدينة" />
        <Button type="submit">بحث</Button>
      </form>
      {!isSupabaseConfigured ? <NotConfigured /> : failed ? (
        <Alert tone="error">تعذّر تحميل الدليل حاليًا.</Alert>
      ) : rows.length === 0 ? (
        <EmptyState title="لا توجد مراكز موثقة بعد" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {rows.map((c) => (
              <Card key={c.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-brand-900">{c.name}</h2>
                  <Badge tone="green">موثّق</Badge>
                </div>
                {c.organization_name && <p className="text-sm text-muted">تابع لـ {c.organization_name}</p>}
                {(c.city || c.country) && <p className="text-sm text-muted">{[c.city, c.country].filter(Boolean).join("، ")}</p>}
                {c.description && <p className="line-clamp-3 text-muted">{c.description}</p>}
              </Card>
            ))}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/centers?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
        </>
      )}
    </>
  );
}
