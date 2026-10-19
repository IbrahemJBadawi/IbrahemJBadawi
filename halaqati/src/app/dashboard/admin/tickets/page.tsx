import type { Metadata } from "next";
import { Badge, Button, Card, EmptyState, PageHeader, Select, Textarea } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { TICKET_CATEGORY, TICKET_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { adminUpdateTicketAction } from "../actions";

export const metadata: Metadata = { title: "البلاغات والدعم" };

type T = { id: string; full_name: string; email: string; category: string; subject: string; body: string; related_path: string | null; status: string; admin_reply: string | null; created_at: string };

export default async function TicketsPage() {
  await requireContext("platform_admin");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_tickets", { p_status: null, p_limit: 50 });
  const rows = (data ?? []) as T[];
  return (
    <div className="flex flex-col gap-3">
      <PageHeader title="البلاغات والدعم" description="بلاغات المحتوى المخالف تظهر أولًا." />
      {rows.length === 0 ? <EmptyState title="لا توجد بلاغات" /> : rows.map((t) => (
        <Card key={t.id} className={`flex flex-col gap-2 ${t.category === "report_abuse" && (t.status === "open" || t.status === "in_progress") ? "border-danger/40" : ""}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">{t.subject}</p>
            <span className="flex gap-1"><Badge tone={t.category === "report_abuse" ? "red" : "gray"}>{TICKET_CATEGORY[t.category]}</Badge><Badge tone="gold">{TICKET_STATUS[t.status]}</Badge></span>
          </div>
          <p className="text-sm text-muted">{t.full_name} · <span dir="ltr">{t.email}</span> · {formatDateTime(t.created_at)}</p>
          <p className="whitespace-pre-line">{t.body}</p>
          {t.related_path && <a href={t.related_path} className="text-sm font-semibold text-brand-800 underline" dir="ltr">{t.related_path}</a>}
          {t.admin_reply && <p className="rounded-lg bg-brand-50 p-2 text-sm">الرد: {t.admin_reply}</p>}
          <form action={adminUpdateTicketAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="id" value={t.id} />
            <Textarea name="reply" rows={2} placeholder="رد يصل للمستخدم (اختياري)" aria-label="الرد" className="sm:flex-1" />
            <Select name="status" defaultValue={t.status === "open" ? "in_progress" : t.status} aria-label="الحالة" className="sm:!w-40">
              {Object.entries(TICKET_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Button type="submit">حفظ</Button>
          </form>
        </Card>
      ))}
    </div>
  );
}
