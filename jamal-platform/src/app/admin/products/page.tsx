import Link from "next/link";
import { Plus } from "lucide-react";
import { withAdmin } from "@/lib/admin";
import { formatMoney } from "@/lib/money";
import { label, t } from "@/lib/i18n/ar";
import { AdminTitle, Table, td } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { formatDate } from "@/components/orders/OrderParts";

export const metadata = { title: "المنتجات" };

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const status = typeof sp.status === "string" && ["draft", "published", "hidden"].includes(sp.status) ? sp.status : "";
  const issue = typeof sp.issue === "string" ? sp.issue : "";
  const rows = await withAdmin((tx) => {
    const where = ["true"];
    const params: unknown[] = [];
    if (q) { params.push(`%${q}%`); where.push(`(p.name_ar ilike $${params.length} or p.slug ilike $${params.length} or coalesce(p.name_en,'') ilike $${params.length})`); }
    if (status) { params.push(status); where.push(`p.status = $${params.length}`); }
    if (issue === "supplier") where.push("p.status = 'published' and not exists (select 1 from public.supplier_products s where s.product_id = p.id and s.is_primary)");
    if (issue === "images") where.push("jsonb_array_length(p.images) = 0");
    if (issue === "demo") where.push("p.is_demo");
    if (issue === "stale") where.push("p.status = 'published' and not p.is_demo and (p.stock_confirmed_at is null or p.stock_confirmed_at < now() - interval '7 days')");
    return tx.query<{ id: string; slug: string; name_ar: string; status: string; availability: string; price: string; sale_price: string | null; currency_code: string; category: string | null; variants: number; supplier: string | null; is_demo: boolean; stock_confirmed_at: string | null }>(
      `select p.id, p.slug, p.name_ar, p.status, p.availability, p.price::text, p.sale_price::text, p.currency_code, c.name_ar as category,
              (select count(*)::int from public.product_variants v where v.product_id = p.id) as variants,
              (select s.name from public.supplier_products sp join public.suppliers s on s.id = sp.supplier_id where sp.product_id = p.id and sp.is_primary limit 1) as supplier,
              p.is_demo, p.stock_confirmed_at::text
       from public.products p left join public.categories c on c.id = p.category_id
       where ${where.join(" and ")} order by p.updated_at desc limit 200`,
      params,
    );
  });
  return (
    <>
      <AdminTitle title="المنتجات" description={`${rows.length} منتج`} action={<ButtonLink href="/admin/products/new"><Plus className="size-4" /> منتج جديد</ButtonLink>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="بحث بالاسم أو المعرّف" className="max-w-xs" />
        <Select name="status" defaultValue={status} className="w-auto">
          <option value="">كل الحالات</option>
          {Object.entries(t.productStatus).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <button className="rounded-md border border-line bg-paper px-4 text-sm">تصفية</button>
        {(q || status || issue) && <Link href="/admin/products" className="self-center text-sm text-muted underline">مسح</Link>}
      </form>
      <Table head={["المنتج", "الفئة", "السعر", "الحالة", "التوفر", "آخر تأكيد", "المورد الأساسي"]} empty={!rows.length}>
        {rows.map((p) => (
          <tr key={p.id}>
            <td className={td}>
              <Link href={`/admin/products/${p.id}`} className="font-semibold hover:underline">{p.name_ar}</Link>
              {p.is_demo && <Badge tone="warning" className="ms-2">تجريبي</Badge>}
              <div className="ltr text-xs text-muted">{p.slug}</div>
            </td>
            <td className={td}>{p.category ?? "—"}</td>
            <td className={td}>{formatMoney(p.sale_price ?? p.price, p.currency_code)}{p.sale_price && <s className="ms-1 text-xs text-muted">{formatMoney(p.price, p.currency_code)}</s>}</td>
            <td className={td}><Badge tone={p.status === "published" ? "success" : p.status === "draft" ? "neutral" : "outline"}>{label(t.productStatus, p.status)}</Badge></td>
            <td className={td}>{label(t.availability, p.availability)}</td>
            <td className={`${td} text-xs`}>{p.stock_confirmed_at ? formatDate(p.stock_confirmed_at) : <span className="text-warning">لم يُؤكد</span>}</td>
            <td className={td}>{p.supplier ?? <span className="text-warning">غير محدد</span>}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
