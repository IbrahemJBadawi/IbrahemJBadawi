import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, EmptyState, PageHeader, Pagination, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { markNotificationReadAction } from "../actions";

export const metadata: Metadata = { title: "الإشعارات" };
const PAGE_SIZE = 20;

export default async function NotificationsPage({ searchParams }: PageProps<"/dashboard/notifications">) {
  await requireUser();
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const supabase = await createClient();
  const { data, count } = await supabase
    .from("notifications")
    .select("id, title, body, link_path, read_at, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const rows = data ?? [];
  return (
    <>
      <PageHeader
        title="الإشعارات"
        actions={rows.some((n) => !n.read_at) && (
          <form action={markNotificationReadAction}>
            <input type="hidden" name="all" value="1" />
            <Button type="submit" variant="secondary">تعليم الكل كمقروء</Button>
          </form>
        )}
      />
      {rows.length === 0 ? (
        <EmptyState title="لا توجد إشعارات" />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((n) => (
            <li key={n.id}>
              <Card className={cx("flex items-start justify-between gap-3", !n.read_at && "border-brand-600/40 bg-brand-50")}>
                <div>
                  <p className="font-semibold">{n.link_path ? <Link href={n.link_path} className="underline">{n.title}</Link> : n.title}</p>
                  {n.body && <p className="text-muted">{n.body}</p>}
                  <p className="text-sm text-muted">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.read_at && (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" variant="ghost" className="!px-2 text-sm">مقروء</Button>
                  </form>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => `/dashboard/notifications?page=${p}`} />
    </>
  );
}
