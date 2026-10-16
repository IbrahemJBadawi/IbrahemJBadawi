import { withAdmin } from "@/lib/admin";
import { lookups } from "@/lib/admin/lookups";
import { AdminTitle, Card } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "منتج جديد" };

export default async function NewProduct() {
  const { categories, currencies } = await withAdmin((tx) => lookups(tx));
  return (
    <>
      <AdminTitle title="منتج جديد" description="يُنصح بالحفظ كمسودة، ثم إضافة الخيارات (المقاسات/الألوان) وبيانات المورد قبل النشر." />
      <Card><ProductForm categories={categories} currencies={currencies} /></Card>
    </>
  );
}
