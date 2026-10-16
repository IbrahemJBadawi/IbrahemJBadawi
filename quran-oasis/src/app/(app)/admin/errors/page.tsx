import { ErrorsAdmin } from "@/components/admin/AdminSections";
import { requireAdmin } from "@/lib/admin-guard";

export default async function Page() {
  await requireAdmin();
  return <ErrorsAdmin />;
}
