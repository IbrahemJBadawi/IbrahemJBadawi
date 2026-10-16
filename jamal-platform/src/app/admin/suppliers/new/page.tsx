import { requireAdmin } from "@/lib/auth";
import { AdminTitle, Card } from "@/components/admin/ui";
import { SupplierForm } from "@/components/admin/SupplierForm";

export const metadata = { title: "مورد جديد" };

export default async function NewSupplier() {
  await requireAdmin();
  return (
    <>
      <AdminTitle title="مورد جديد" />
      <Card><SupplierForm /></Card>
    </>
  );
}
