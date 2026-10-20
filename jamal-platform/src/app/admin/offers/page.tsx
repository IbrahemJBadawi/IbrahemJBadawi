import Link from "next/link";
import { withAdmin } from "@/lib/admin";
import { updatePricesAction } from "@/lib/actions/admin/catalog";
import { AdminTitle, Card } from "@/components/admin/ui";
import { ActionForm } from "@/components/forms/ActionForm";
import { Input } from "@/components/ui/Field";

export const metadata = { title: "العروض والأسعار" };

export default async function AdminOffers({ searchParams }: PageProps<"/admin/offers">) {
  const sp = await searchParams;
  const onlySale = sp.sale === "1";
  const rows = await withAdmin((tx) =>
    tx.query<{ id: string; name_ar: string; price: string; sale_price: string | null; currency_code: string; status: string }>(
      `select id, name_ar, price::text, sale_price::text, currency_code, status from public.products
       ${onlySale ? "where sale_price is not null" : ""} order by (sale_price is not null) desc, name_ar limit 300`,
    ),
  );
  return (
    <div className="space-y-6">
      <AdminTitle
        title="العروض والأسعار"
        description="عدّل السعر وسعر التخفيض بسرعة. المنتجات ذات سعر التخفيض تظهر تلقائيًا في صفحة العروض."
        action={<Link href={onlySale ? "/admin/offers" : "/admin/offers?sale=1"} className="text-sm text-beige-deep underline">{onlySale ? "عرض كل المنتجات" : "المخفّضة فقط"}</Link>}
      />
      <Card>
        <ul className="divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="py-3">
              <ActionForm action={updatePricesAction} submitLabel="حفظ" size="sm" variant="secondary" className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={r.id} />
                <Link href={`/admin/products/${r.id}`} className="min-w-48 flex-1 text-sm font-semibold hover:underline">{r.name_ar}</Link>
                <span className="text-xs text-muted">{r.currency_code}</span>
                <Input name="price" defaultValue={r.price} dir="ltr" className="h-9 w-28 py-1" aria-label="السعر" required />
                <Input name="sale_price" defaultValue={r.sale_price ?? ""} dir="ltr" placeholder="بدون تخفيض" className="h-9 w-28 py-1" aria-label="سعر التخفيض" />
              </ActionForm>
            </li>
          ))}
        </ul>
        {rows.length === 0 && <p className="text-sm text-muted">لا توجد منتجات.</p>}
      </Card>
    </div>
  );
}
