import type { Metadata } from "next";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, Pagination, Select } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { APP_ROLES, CONTEXT_LABELS, type AppRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { adminSetRoleAction } from "../actions";

export const metadata: Metadata = { title: "المستخدمون" };
const PAGE_SIZE = 25;

type Row = { id: string; full_name: string; email: string; roles: AppRole[]; created_at: string; total_count: number };

export default async function AdminUsersPage({ searchParams }: PageProps<"/dashboard/admin/users">) {
  await requireContext("platform_admin");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_list_users", { p_search: q || null, p_limit: PAGE_SIZE, p_offset: (page - 1) * PAGE_SIZE });
  const rows = (data ?? []) as Row[];
  const total = Number(rows[0]?.total_count ?? 0);
  const back = `/dashboard/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page) })}`;
  return (
    <>
      <PageHeader title="المستخدمون والأدوار" description="كل منح أو سحب للأدوار يُسجَّل في سجل التدقيق." />
      {typeof sp.error === "string" && <div className="mb-4"><Alert tone="error">{sp.error}</Alert></div>}
      {error && <div className="mb-4"><Alert tone="error">تعذّر تحميل المستخدمين.</Alert></div>}
      <form role="search" className="mb-4 flex gap-2">
        <label htmlFor="q" className="sr-only">بحث</label>
        <Input name="q" defaultValue={q} placeholder="الاسم أو البريد" />
        <Button type="submit">بحث</Button>
      </form>
      {rows.length === 0 ? <EmptyState title="لا توجد نتائج" /> : (
        <div className="flex flex-col gap-3">
          {rows.map((u) => (
            <Card key={u.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">{u.full_name}</p>
                  <p className="text-sm text-muted" dir="ltr">{u.email}</p>
                  <p className="text-sm text-muted">انضم {formatDate(u.created_at)}</p>
                </div>
                <div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone={r === "platform_admin" ? "gold" : "green"}>{CONTEXT_LABELS[r]}</Badge>)}</div>
              </div>
              <form action={adminSetRoleAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="back" value={back} />
                <Select name="role" aria-label="الدور" className="!w-auto">
                  {APP_ROLES.map((r) => <option key={r} value={r}>{CONTEXT_LABELS[r]}</option>)}
                </Select>
                <Button type="submit" name="op" value="grant" variant="secondary">منح</Button>
                <Button type="submit" name="op" value="revoke" variant="ghost">سحب</Button>
              </form>
            </Card>
          ))}
        </div>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/dashboard/admin/users?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`} />
    </>
  );
}
