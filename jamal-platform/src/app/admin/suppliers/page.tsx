import Link from "next/link";
import { Plus } from "lucide-react";
import { withAdmin } from "@/lib/admin";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { label, t } from "@/lib/i18n/ar";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "الموردون" };

export default async function AdminSuppliers() {
  const rows = await withAdmin((tx) =>
    tx.query<{ id: string; name: string; coverage_areas: string | null; agreement_status: string; terms_confirmed_at: string | null; prices_confirmed_at: string | null; is_active: boolean; products: number; open_fulfillments: number; self_registered: boolean; pending_products: number }>(
      `select s.id, s.name, s.coverage_areas, s.agreement_status, s.terms_confirmed_at::text, s.prices_confirmed_at::text, s.is_active,
              s.owner_user_id is not null as self_registered,
              (select count(*)::int from public.products p where p.submitted_by_supplier = s.id and p.review_status = 'pending') as pending_products,
              (select count(distinct product_id)::int from public.supplier_products sp where sp.supplier_id = s.id) as products,
              (select count(*)::int from public.fulfillment_records f where f.supplier_id = s.id and f.status in ('awaiting_supplier','sent_to_supplier','supplier_accepted','preparing')) as open_fulfillments
       from public.suppliers s order by (s.agreement_status = 'applied') desc, (s.agreement_status = 'approved') desc, s.name`,
    ),
  );
  return (
    <>
      <AdminTitle title="الموردون" description="بيانات داخلية لا تظهر للعملاء. إرسال الطلبات للموردين يتم يدويًا من صفحة الطلب." action={<ButtonLink href="/admin/suppliers/new"><Plus className="size-4" /> مورد جديد</ButtonLink>} />
      <Table head={["المورد", "الحالة", "التغطية", "تأكيد الشروط", "آخر تأكيد أسعار", "المنتجات", "تنفيذ مفتوح"]} empty={!rows.length}>
        {rows.map((s) => (
          <tr key={s.id}>
            <td className={td}><Link href={`/admin/suppliers/${s.id}`} className="font-semibold hover:underline">{s.name}</Link>{!s.is_active && <Badge tone="outline" className="ms-2">غير نشط</Badge>}{s.self_registered && <Badge tone="outline" className="ms-2">حساب مورد</Badge>}{s.pending_products > 0 && <Link href="/admin/products?issue=review" className="ms-2 text-xs text-warning underline">{s.pending_products} منتج للمراجعة</Link>}</td>
            <td className={td}><Badge tone={s.agreement_status === "approved" ? "success" : s.agreement_status === "suspended" ? "danger" : "warning"}>{label(t.supplierStatus, s.agreement_status)}</Badge></td>
            <td className={`${td} text-xs`}>{s.coverage_areas ?? "—"}</td>
            <td className={`${td} text-xs`}>{s.terms_confirmed_at ? formatDate(s.terms_confirmed_at) : <span className="text-warning">غير مؤكد</span>}</td>
            <td className={`${td} text-xs`}>{s.prices_confirmed_at ? formatDate(s.prices_confirmed_at) : "—"}</td>
            <td className={td}>{s.products}</td>
            <td className={td}>{s.open_fulfillments}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
