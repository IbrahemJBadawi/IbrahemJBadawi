import Link from "next/link";
import { Plus } from "lucide-react";
import { withAdmin } from "@/lib/admin";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export const metadata = { title: "الموردون" };

export default async function AdminSuppliers() {
  const rows = await withAdmin((tx) =>
    tx.query<{ id: string; name: string; country_code: string | null; ships_to: string[]; cod_countries: string[]; is_active: boolean; products: number; open_fulfillments: number }>(
      `select s.id, s.name, s.country_code, s.ships_to, s.cod_countries, s.is_active,
              (select count(distinct product_id)::int from public.supplier_products sp where sp.supplier_id = s.id) as products,
              (select count(*)::int from public.fulfillment_records f where f.supplier_id = s.id and f.status in ('pending','sent_to_supplier','confirmed')) as open_fulfillments
       from public.suppliers s order by s.is_active desc, s.name`,
    ),
  );
  return (
    <>
      <AdminTitle title="الموردون" description="بيانات داخلية لا تظهر للعملاء. إرسال الطلبات للموردين يتم يدويًا من صفحة الطلب." action={<ButtonLink href="/admin/suppliers/new"><Plus className="size-4" /> مورد جديد</ButtonLink>} />
      <Table head={["المورد", "الدولة", "يشحن إلى", "الدفع عند الاستلام", "المنتجات", "تنفيذ مفتوح"]} empty={!rows.length}>
        {rows.map((s) => (
          <tr key={s.id}>
            <td className={td}><Link href={`/admin/suppliers/${s.id}`} className="font-semibold hover:underline">{s.name}</Link>{!s.is_active && <Badge tone="outline" className="ms-2">غير نشط</Badge>}</td>
            <td className={td}>{s.country_code ?? "—"}</td>
            <td className={`${td} ltr`}>{s.ships_to.join(" ") || "—"}</td>
            <td className={`${td} ltr`}>{s.cod_countries.join(" ") || "—"}</td>
            <td className={td}>{s.products}</td>
            <td className={td}>{s.open_fulfillments}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
