import { withAdmin } from "@/lib/admin";
import { setRoleAction } from "@/lib/actions/admin/operations";
import { AdminTitle, Card, Table, td } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Select } from "@/components/ui/Field";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "العملاء" };

export default async function AdminCustomers({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const data = await withAdmin(async (tx, admin) => {
    const params = q ? [`%${q}%`] : [];
    const users = await tx.query<{ id: string; email: string | null; full_name: string | null; phone: string | null; role: string; created_at: string; orders: number }>(
      `select p.id, p.email, p.full_name, p.phone, p.role, p.created_at::text,
              (select count(*)::int from public.orders o where o.user_id = p.id and not o.is_test) as orders
       from public.profiles p ${q ? "where p.email ilike $1 or p.full_name ilike $1 or p.phone ilike $1" : ""}
       order by p.created_at desc limit 300`,
      params,
    );
    const guests = await tx.query<{ customer_name: string; customer_phone: string; orders: number; last: string }>(
      `select max(customer_name) as customer_name, customer_phone, count(*)::int as orders, max(created_at)::text as last
       from public.orders where user_id is null and not is_test ${q ? "and (customer_name ilike $1 or customer_phone ilike $1)" : ""}
       group by customer_phone order by max(created_at) desc limit 100`,
      params,
    );
    return { users, guests, adminId: admin.id };
  });
  return (
    <div className="space-y-6">
      <AdminTitle title="العملاء" description="بيانات العملاء خاصة — استخدمها لتنفيذ الطلبات فقط." />
      <form className="flex gap-2"><input name="q" defaultValue={q} placeholder="بحث بالاسم أو البريد أو الهاتف" className="h-10 w-full max-w-xs rounded-md border border-line bg-paper px-3 text-sm" /><button className="h-10 rounded-md border border-line bg-paper px-4 text-sm">بحث</button></form>
      <Card title={`الحسابات المسجلة (${data.users.length})`}>
        <Table head={["الاسم", "البريد", "الهاتف", "الطلبات", "التسجيل", "الصلاحية"]} empty={!data.users.length}>
          {data.users.map((u) => (
            <tr key={u.id}>
              <td className={td}>{u.full_name ?? "—"}</td>
              <td className={`${td} ltr`}>{u.email}</td>
              <td className={`${td} ltr`}>{u.phone ?? "—"}</td>
              <td className={td}>{u.orders}</td>
              <td className={`${td} text-xs text-muted`}>{formatDate(u.created_at)}</td>
              <td className={td}>
                {u.id === data.adminId ? (
                  <span className="text-xs text-muted">مسؤول (أنت)</span>
                ) : (
                  <ActionForm action={setRoleAction} submitLabel="حفظ" size="sm" variant="ghost" confirm="تغيير صلاحية هذا الحساب؟" className="flex items-center gap-1">
                    <input type="hidden" name="id" value={u.id} />
                    <Select name="role" defaultValue={u.role} className="h-8 w-auto py-0 text-xs" aria-label="الصلاحية">
                      <option value="customer">عميل</option>
                      <option value="admin">مسؤول</option>
                    </Select>
                  </ActionForm>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="عملاء طلبوا كضيوف">
        <Table head={["الاسم", "الهاتف", "الطلبات", "آخر طلب"]} empty={!data.guests.length}>
          {data.guests.map((g) => (
            <tr key={g.customer_phone}>
              <td className={td}>{g.customer_name}</td>
              <td className={`${td} ltr`}>{g.customer_phone}</td>
              <td className={td}><a href={`/admin/orders?q=${encodeURIComponent(g.customer_phone)}`} className="underline">{g.orders}</a></td>
              <td className={`${td} text-xs text-muted`}>{formatDate(g.last)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
