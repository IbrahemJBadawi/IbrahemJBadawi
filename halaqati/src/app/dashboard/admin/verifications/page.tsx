import type { Metadata } from "next";
import { Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { REVIEW_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { adminReviewVerificationAction } from "../actions";

export const metadata: Metadata = { title: "طلبات التوثيق" };

type Req = { id: string; full_name: string; email: string; qualifications: string; evidence_url: string | null; status: string; review_note: string | null; created_at: string };

export default async function VerificationsPage() {
  await requireContext("platform_admin");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_verification_requests", { p_limit: 50 });
  const rows = (data ?? []) as Req[];
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="طلبات توثيق المحفّظين" description="تحقّق من الإجازة أو السند قبل منح علامة ✓. لا تطلب وثائق هوية." />
      {rows.length === 0 ? <EmptyState title="لا توجد طلبات" /> : rows.map((r) => (
        <Card key={r.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-bold">{r.full_name}</p><p className="text-sm text-muted" dir="ltr">{r.email}</p></div>
            <Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "gold"}>{REVIEW_STATUS[r.status]}</Badge>
          </div>
          <p className="whitespace-pre-line">{r.qualifications}</p>
          {r.evidence_url && <a href={r.evidence_url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-800 underline" dir="ltr">{r.evidence_url}</a>}
          <p className="text-sm text-muted">{formatDate(r.created_at)}{r.review_note ? ` · ${r.review_note}` : ""}</p>
          {r.status === "pending" && (
            <form action={adminReviewVerificationAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              <Input name="note" placeholder="ملاحظة للمحفّظ" className="sm:max-w-xs" aria-label="ملاحظة" />
              <Button type="submit" name="decision" value="approve">توثيق ✓</Button>
              <Button type="submit" name="decision" value="reject" variant="ghost">رفض</Button>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}
