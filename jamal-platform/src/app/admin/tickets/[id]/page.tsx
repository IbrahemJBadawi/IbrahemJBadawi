import Link from "next/link";
import { notFound } from "next/navigation";
import { withAdmin } from "@/lib/admin";
import { staffReplyAction, updateTicketAction } from "@/lib/actions/admin/workflow";
import type { TicketMessage } from "@/lib/data/tickets";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Card } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { TicketThread } from "@/components/support/TicketThread";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "تذكرة" };

export default async function AdminTicket({ params }: PageProps<"/admin/tickets/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await withAdmin(async (tx) => {
    const [tk] = await tx.query<{ id: string; code: string; subject_ar: string; category: string; status: string; priority: string; created_at: string; who: string | null; phone: string | null; email: string | null; order_id: string | null; order_number: string | null }>(
      `select t.id, t.code, t.subject_ar, t.category, t.status, t.priority, t.created_at::text, coalesce(p.full_name, t.guest_name) as who,
              coalesce(p.phone, t.guest_phone) as phone, p.email, t.order_id, o.order_number
       from public.support_tickets t left join public.profiles p on p.id = t.user_id left join public.orders o on o.id = t.order_id where t.id = $1`,
      [id],
    );
    if (!tk) return null;
    const messages = await tx.query<TicketMessage>(
      `select m.id, m.author_kind, m.body_ar, m.is_internal, m.created_at::text, p.email as author
       from public.ticket_messages m left join public.profiles p on p.id = m.author_id where m.ticket_id = $1 order by m.created_at`,
      [id],
    );
    const events = await tx.query<{ id: string; kind: string; note_ar: string | null; created_at: string; actor: string | null }>(
      "select e.id, e.kind, e.note_ar, e.created_at::text, p.email as actor from public.ticket_events e left join public.profiles p on p.id = e.actor_id where e.ticket_id = $1 order by e.created_at",
      [id],
    );
    return { tk, messages, events };
  });
  if (!data) notFound();
  const { tk, messages, events } = data;
  return (
    <div className="space-y-6">
      <AdminTitle
        title={tk.subject_ar}
        description={<span className="flex flex-wrap items-center gap-2"><span className="ltr font-mono">{tk.code}</span><Badge>{label(t.ticketCategory, tk.category)}</Badge><Badge tone="warning">{label(t.ticketStatus, tk.status)}</Badge><span>{formatDate(tk.created_at)}</span></span>}
        action={<Link href="/admin/tickets" className="text-sm text-muted hover:underline">كل التذاكر</Link>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem] [&>*]:min-w-0">
        <div className="space-y-6">
          <Card title="المحادثة"><TicketThread messages={messages} staffView /></Card>
          <Card title="الرد">
            <ActionForm action={staffReplyAction} submitLabel="إرسال" resetOnSuccess className="space-y-3">
              <input type="hidden" name="ticketId" value={tk.id} />
              <Textarea name="body" rows={4} required aria-label="الرد" />
              <Checkbox name="internal" label="ملاحظة داخلية (لا يراها العميل)" />
            </ActionForm>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="العميل">
            <p className="text-sm">{tk.who}</p>
            {tk.phone && <p className="ltr text-end text-sm"><a href={`tel:${tk.phone.replace(/\s/g, "")}`} className="underline">{tk.phone}</a></p>}
            {tk.email && <p className="ltr text-end text-xs text-muted">{tk.email}</p>}
            {tk.order_id && <Link href={`/admin/orders/${tk.order_id}`} className="mt-2 inline-block text-sm text-beige-deep underline">الطلب {tk.order_number}</Link>}
          </Card>
          <Card title="الحالة">
            <ActionForm action={updateTicketAction} submitLabel="حفظ" className="space-y-3">
              <input type="hidden" name="ticketId" value={tk.id} />
              <Field label="الحالة"><Select name="status" defaultValue={tk.status}>{Object.entries(t.ticketStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Field label="الأولوية"><Select name="priority" defaultValue={tk.priority}>{Object.entries(t.ticketPriority).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
              <Checkbox name="assignToMe" label="إسنادها لي" />
            </ActionForm>
          </Card>
          <Card title="السجل">
            <ol className="space-y-2 text-xs">
              {events.map((e) => <li key={e.id}><span className="font-semibold">{e.note_ar ?? e.kind}</span> · {formatDate(e.created_at)}{e.actor && ` · ${e.actor}`}</li>)}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
