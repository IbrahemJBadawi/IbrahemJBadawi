import type { Metadata } from "next";
import { Suspense } from "react";
import { getCustomerTicket } from "@/lib/data/tickets";
import { customerCloseAction, customerReplyAction } from "@/lib/actions/support";
import { label, t } from "@/lib/i18n/ar";
import { ActionForm } from "@/components/forms/ActionForm";
import { Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, Notice, Skeleton } from "@/components/ui/States";
import { TicketThread } from "@/components/support/TicketThread";
import { CopyButton } from "@/components/admin/CopyButton";

export const metadata: Metadata = { title: "تذكرة دعم", robots: { index: false, follow: false } };

async function Content({ params, searchParams }: PageProps<"/support/[code]">) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t.slice(0, 100) : null;
  const ticket = await getCustomerTicket(decodeURIComponent(code), token);
  if (!ticket) return <EmptyState title="لا يمكن عرض هذه التذكرة" description="تأكد من الرابط أو سجّل الدخول بالحساب الذي فتحها." action={<ButtonLink href="/support">الدعم</ButtonLink>} />;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const hidden = (
    <>
      <input type="hidden" name="code" value={ticket.code} />
      {token && <input type="hidden" name="t" value={token} />}
    </>
  );
  return (
    <div className="space-y-6">
      {sp.new === "1" && (
        <div className="space-y-3">
          <Notice tone="success">تم فتح التذكرة. سنرد عليك هنا{token ? "، احفظ رابط هذه الصفحة" : ""}.</Notice>
          {token && <CopyButton text={`${site}/support/${ticket.code}?t=${token}`} label="نسخ رابط التذكرة" />}
        </div>
      )}
      <div>
        <p className="ltr font-mono text-sm text-muted">{ticket.code}</p>
        <h1 className="mt-1 text-xl font-bold">{ticket.subject_ar}</h1>
        <p className="mt-2 flex flex-wrap gap-2"><Badge>{label(t.ticketCategory, ticket.category)}</Badge><Badge tone={ticket.status === "waiting_customer" ? "warning" : "neutral"}>{label(t.ticketStatus, ticket.status)}</Badge>{ticket.order_number && <Badge tone="outline">طلب {ticket.order_number}</Badge>}</p>
      </div>
      <TicketThread messages={ticket.messages} />
      <ActionForm action={customerReplyAction} submitLabel="إرسال" resetOnSuccess className="space-y-3">
        {hidden}
        <Textarea name="body" rows={3} required aria-label="رسالتك" placeholder="اكتب ردك…" />
      </ActionForm>
      {!["closed"].includes(ticket.status) && (
        <ActionForm action={customerCloseAction} submitLabel="إغلاق التذكرة (تم الحل)" variant="ghost" size="sm" className="">
          {hidden}
        </ActionForm>
      )}
    </div>
  );
}

export default function TicketPage(props: PageProps<"/support/[code]">) {
  return (
    <div className="container-page max-w-2xl py-8 md:py-12">
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <Content {...props} />
      </Suspense>
    </div>
  );
}
