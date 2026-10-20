import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { createHalaqaAction } from "../../actions";
import { HalaqaForm } from "../../HalaqaForm";

export const metadata: Metadata = { title: "حلقة جديدة" };

export default async function NewHalaqaPage() {
  const user = await requireContext("quran_teacher");
  const centers = user.centers.filter((c) => c.role === "teacher" || c.role === "admin").map((c) => ({ id: c.id, name: c.name }));
  return (
    <>
      <PageHeader title="حلقة جديدة" description="الحلقة المستقلة لا تحتاج إلى أي مركز. احفظها كمسودة ثم انشرها عندما تكون جاهزة." />
      <Card>
        <HalaqaForm action={createHalaqaAction} centers={centers} submitLabel="إنشاء الحلقة" />
      </Card>
    </>
  );
}
