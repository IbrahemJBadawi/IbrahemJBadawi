import Link from "next/link";
import { notFound } from "next/navigation";
import { withAdmin } from "@/lib/admin";
import { deleteSupplierAction } from "@/lib/actions/admin/operations";
import { formatMoney } from "@/lib/money";
import { AdminTitle, Card, Table, td } from "@/components/admin/ui";
import { SUPPLIER_SELECT, SupplierForm, type SupplierRow } from "@/components/admin/SupplierForm";
import { ActionForm } from "@/components/forms/ActionForm";

export const metadata = { title: "مورد" };

export default async function SupplierPage({ params }: PageProps<"/admin/suppliers/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await withAdmin(async (tx) => {
    const [s] = await tx.query<SupplierRow>(
      `select ${SUPPLIER_SELECT} from public.suppliers where id = $1`,
      [id],
    );
    if (!s) return null;
    const products = await tx.query<{ product_id: string; name_ar: string; cost: string; shipping_cost: string; currency_code: string; supplier_sku: string | null; is_primary: boolean }>(
      `select sp.product_id, p.name_ar, sp.cost::text, sp.shipping_cost::text, sp.currency_code, sp.supplier_sku, sp.is_primary
       from public.supplier_products sp join public.products p on p.id = sp.product_id where sp.supplier_id = $1 order by p.name_ar`,
      [id],
    );
    return { s, products };
  });
  if (!data) notFound();
  return (
    <div className="space-y-6">
      <AdminTitle title={data.s.name} />
      <Card title="بيانات المورد"><SupplierForm s={data.s} /></Card>
      <Card title={`المنتجات المرتبطة (${data.products.length})`}>
        <Table head={["المنتج", "SKU", "التكلفة", "الشحن المقدر", "أساسي"]} empty={!data.products.length}>
          {data.products.map((p) => (
            <tr key={p.product_id + (p.supplier_sku ?? "")}>
              <td className={td}><Link href={`/admin/products/${p.product_id}`} className="hover:underline">{p.name_ar}</Link></td>
              <td className={`${td} ltr`}>{p.supplier_sku ?? "—"}</td>
              <td className={td}>{formatMoney(p.cost, p.currency_code)}</td>
              <td className={td}>{formatMoney(p.shipping_cost, p.currency_code)}</td>
              <td className={td}>{p.is_primary ? "نعم" : "—"}</td>
            </tr>
          ))}
        </Table>
      </Card>
      <Card title="حذف المورد">
        <p className="mb-3 text-sm text-muted">يُفضّل تعطيل المورد بدل حذفه. الحذف يزيل روابطه بالمنتجات، وتبقى سجلات الطلبات السابقة بدون اسم مورد.</p>
        <ActionForm action={deleteSupplierAction} submitLabel="حذف المورد" variant="danger" confirm="حذف المورد نهائيًا؟">
          <input type="hidden" name="id" value={data.s.id} />
        </ActionForm>
      </Card>
    </div>
  );
}
