import type { Metadata } from "next";
import Link from "next/link";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { staffHalaqat } from "@/lib/data/halaqat";
import { HALAQA_STATUS, MEETING_MODE } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "حلقاتي" };

export default async function TeacherHalaqatPage() {
  const user = await requireContext("quran_teacher");
  const supabase = await createClient();
  const { rows } = await staffHalaqat(supabase, user.id);
  return (
    <>
      <PageHeader title="حلقاتي" actions={<ButtonLink href="/dashboard/teacher/halaqat/new">حلقة جديدة</ButtonLink>} />
      {rows.length === 0 ? (
        <EmptyState title="لا توجد حلقات بعد">أنشئ حلقتك الأولى، واجعل حالتها «منشورة» ليراها الطلاب.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <Link href={`/dashboard/teacher/halaqat/${r.halaqa_id}`} className="text-lg font-bold text-brand-900 underline">{r.halaqat?.name}</Link>
                <Badge tone={r.halaqat?.status === "published" ? "green" : "gray"}>{HALAQA_STATUS[r.halaqat?.status ?? "draft"]}</Badge>
              </div>
              <p className="text-sm text-muted">{MEETING_MODE[r.halaqat?.meeting_mode ?? "remote"]} · {r.role === "teacher" ? "المحفّظ المسؤول" : "مساعد"}</p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
