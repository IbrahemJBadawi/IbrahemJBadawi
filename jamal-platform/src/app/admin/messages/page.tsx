import { withAdmin } from "@/lib/admin";
import { updateMessageStatusAction } from "@/lib/actions/admin/operations";
import { AdminTitle, Card } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "الرسائل" };
const STATUS: Record<string, string> = { new: "جديدة", in_progress: "قيد المتابعة", closed: "مغلقة" };

export default async function AdminMessages() {
  const rows = await withAdmin((tx) =>
    tx.query<{ id: string; name: string; email: string | null; phone: string | null; subject: string | null; message: string; status: string; created_at: string }>(
      "select id, name, email, phone, subject, message, status, created_at::text from public.contact_messages order by (status = 'new') desc, created_at desc limit 200",
    ),
  );
  return (
    <div className="space-y-4">
      <AdminTitle title="رسائل التواصل" description={`${rows.length} رسالة`} />
      {rows.length === 0 && <p className="text-sm text-muted">لا توجد رسائل.</p>}
      {rows.map((m) => (
        <Card key={m.id} title={<span className="flex flex-wrap items-center gap-2">{m.name} <Badge tone={m.status === "new" ? "warning" : "neutral"}>{STATUS[m.status]}</Badge> <span className="text-xs font-normal text-muted">{formatDate(m.created_at)}</span></span>}>
          <p className="mb-1 text-xs text-muted ltr text-end">{[m.email, m.phone].filter(Boolean).join(" · ")}</p>
          {m.subject && <p className="mb-1 text-sm font-semibold">{m.subject}</p>}
          <p className="whitespace-pre-line text-sm leading-7">{m.message}</p>
          <ActionForm action={updateMessageStatusAction} submitLabel="تحديث" size="sm" variant="secondary" className="mt-3 flex items-center gap-2">
            <input type="hidden" name="id" value={m.id} />
            <Select name="status" defaultValue={m.status} className="h-9 w-auto py-1" aria-label="الحالة">
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}
