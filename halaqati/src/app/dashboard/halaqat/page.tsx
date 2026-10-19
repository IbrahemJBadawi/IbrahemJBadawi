import type { Metadata } from "next";
import Link from "next/link";
import { Alert, Badge, Button, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { studentMemberships } from "@/lib/data/halaqat";
import { formatDate } from "@/lib/format";
import { MEMBERSHIP_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { leaveHalaqaAction } from "../student-actions";

export const metadata: Metadata = { title: "حلقاتي" };

export default async function MyHalaqatPage({ searchParams }: PageProps<"/dashboard/halaqat">) {
  const user = await requireContext("student");
  const sp = await searchParams;
  const supabase = await createClient();
  const { rows } = await studentMemberships(supabase, user.id, ["pending", "active", "rejected", "removed", "left"]);
  return (
    <>
      <PageHeader title="حلقاتي" actions={<ButtonLink href="/halaqat" variant="secondary">ابحث عن حلقة</ButtonLink>} />
      {typeof sp.error === "string" && <div className="mb-4"><Alert tone="error">{sp.error}</Alert></div>}
      {rows.length === 0 ? (
        <EmptyState title="لا توجد حلقات بعد"><ButtonLink href="/halaqat" className="mt-3">استعرض الحلقات</ButtonLink></EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((m) => (
            <Card key={m.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/halaqat/${m.halaqa_id}`} className="text-lg font-bold text-brand-900 underline">{m.halaqat?.name ?? "حلقة"}</Link>
                <p className="text-sm text-muted">منذ {formatDate(m.created_at)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={m.status === "active" ? "green" : m.status === "pending" ? "gold" : "gray"}>{MEMBERSHIP_STATUS[m.status]}</Badge>
                {(m.status === "pending" || m.status === "active") && (
                  <form action={leaveHalaqaAction}>
                    <input type="hidden" name="halaqaId" value={m.halaqa_id} />
                    <Button type="submit" variant="ghost" className="text-sm">{m.status === "pending" ? "سحب الطلب" : "مغادرة"}</Button>
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
