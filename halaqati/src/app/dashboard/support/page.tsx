import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { TICKET_CATEGORY, TICKET_STATUS } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { TicketForm } from "./TicketForm";

export const metadata: Metadata = { title: "المساعدة والبلاغات" };

export default async function SupportPage({ searchParams }: PageProps<"/dashboard/support">) {
  await requireUser();
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("support_tickets").select("id, category, subject, status, admin_reply, created_at").order("created_at", { ascending: false }).limit(30);
  const rows = data ?? [];
  const path = typeof sp.path === "string" && sp.path.startsWith("/") && !sp.path.startsWith("//") ? sp.path.slice(0, 300) : undefined;
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="المساعدة والبلاغات" description="أبلغ عن محتوى مخالف أو مشكلة تقنية، أو أرسل اقتراحًا. تراجع إدارة المنصة كل بلاغ." />
      <Card><TicketForm category={typeof sp.category === "string" ? sp.category : undefined} path={path} /></Card>
      {rows.length > 0 && (
        <Card>
          <h2 className="mb-2 text-lg font-bold text-brand-800">بلاغاتي</h2>
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <li key={t.id} className="py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{t.subject}</span>
                  <Badge tone={t.status === "resolved" ? "green" : t.status === "closed" ? "gray" : "gold"}>{TICKET_STATUS[t.status]}</Badge>
                </div>
                <p className="text-sm text-muted">{TICKET_CATEGORY[t.category]} · {formatDate(t.created_at)}</p>
                {t.admin_reply && <p className="mt-1 rounded-lg bg-brand-50 p-2">رد الإدارة: {t.admin_reply}</p>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
