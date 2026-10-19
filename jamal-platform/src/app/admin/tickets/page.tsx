import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { Select } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "تذاكر الدعم" };

export default async function AdminTickets({ searchParams }: PageProps<"/admin/tickets">) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" && sp.status in t.ticketStatus ? sp.status : "";
  const rows = await withAdmin((tx) =>
    tx.query<{ id: string; code: string; subject_ar: string; category: string; status: string; priority: string; updated_at: string; who: string; order_number: string | null; assignee: string | null }>(
      `select t.id, t.code, t.subject_ar, t.category, t.status, t.priority, t.updated_at::text,
              coalesce(p.full_name, p.email, t.guest_name) as who, o.order_number, a.email as assignee
       from public.support_tickets t left join public.profiles p on p.id = t.user_id
       left join public.orders o on o.id = t.order_id left join public.profiles a on a.id = t.assigned_to
       where ${status ? "t.status = $1" : "t.status not in ('closed')"}
       order by (t.status = 'waiting_staff' or t.status = 'open') desc,
                case t.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end, t.updated_at desc limit 300`,
      status ? [status] : [],
    ),
  );
  return (
    <>
      <AdminTitle title="تذاكر الدعم" description="التذاكر المفتوحة وبانتظار الفريق أولًا، ثم حسب الأولوية." />
      <form className="mb-4 flex gap-2">
        <Select name="status" defaultValue={status} className="w-auto" aria-label="الحالة">
          <option value="">كل غير المغلقة</option>
          {Object.entries(t.ticketStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <button className="h-10 rounded-md border border-line bg-paper px-4 text-sm">تصفية</button>
      </form>
      <Table head={["التذكرة", "العميل", "النوع", "الحالة", "الأولوية", "الطلب", "المسؤول", "آخر تحديث"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id}>
            <td className={td}><Link href={`/admin/tickets/${r.id}`} className="font-semibold hover:underline"><span className="ltr font-mono">{r.code}</span> {r.subject_ar}</Link></td>
            <td className={td}>{r.who}</td>
            <td className={`${td} text-xs`}>{label(t.ticketCategory, r.category)}</td>
            <td className={td}><Badge tone={["open", "waiting_staff"].includes(r.status) ? "warning" : "neutral"}>{label(t.ticketStatus, r.status)}</Badge></td>
            <td className={`${td} text-xs`}>{label(t.ticketPriority, r.priority)}</td>
            <td className={`${td} ltr text-xs`}>{r.order_number ?? "—"}</td>
            <td className={`${td} ltr text-xs`}>{r.assignee ?? "—"}</td>
            <td className={`${td} text-xs text-muted`}>{formatDate(r.updated_at)}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
