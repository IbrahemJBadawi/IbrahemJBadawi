import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import type { ScheduleSlot } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { updateHalaqaAction } from "../../../actions";
import { HalaqaForm } from "../../../HalaqaForm";

export const metadata: Metadata = { title: "تعديل الحلقة" };

export default async function EditHalaqaPage({ params }: PageProps<"/dashboard/teacher/halaqat/[id]/edit">) {
  const user = await requireContext("quran_teacher");
  const { id } = await params;
  const supabase = await createClient();
  const { data: h } = await supabase.from("halaqat").select("*, centers(id, name)").eq("id", id).is("deleted_at", null).maybeSingle();
  // UI gate only; the database rejects edits by non-managers anyway.
  const isManager = h && (h.teacher_id === user.id || user.centers.some((c) => c.id === h.center_id && c.role === "admin"));
  if (!h || !isManager) notFound();
  const center = h.centers as { id: string; name: string } | null;
  return (
    <>
      <PageHeader title="تعديل الحلقة" description={h.name} />
      <Card>
        <HalaqaForm
          action={updateHalaqaAction}
          centers={center ? [center] : []}
          values={{ ...h, schedule: (h.schedule ?? []) as ScheduleSlot[] }}
          submitLabel="حفظ التعديلات"
        />
      </Card>
    </>
  );
}
