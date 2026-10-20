import { ExportBar } from "@/components/export/ExportBar";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { CERTIFICATE_KIND } from "@/lib/labels";
import { Reactions } from "@/components/motivation/Reactions";
import { loadReactions } from "@/lib/data/motivation";
import { createClient } from "@/lib/supabase/server";
import type { Certificate } from "@/lib/types";
import { setCertificateVisibilityAction } from "../feature-actions";

export const metadata: Metadata = { title: "شهاداتي" };

export default async function MyCertificatesPage() {
  const user = await requireContext("student");
  const supabase = await createClient();
  const { data } = await supabase.from("certificates").select("*").eq("student_id", user.id).order("issued_on", { ascending: false }).limit(50);
  const rows = (data ?? []) as Certificate[];
  const reactions = await loadReactions(supabase, "certificate", rows.map((c) => c.id), user.id);
  return (
    <>
      <PageHeader title="شهاداتي" description="لكل شهادة رقم فريد وصفحة تحقق عامة يمكنك مشاركتها." actions={<ExportBar type="certificates" fileName="شهاداتي" />} />
      {rows.length === 0 ? <EmptyState title="لا توجد شهادات بعد">يصدر المحفّظ الشهادات عند إتمام جزء أو سورة أو غير ذلك من الإنجازات.</EmptyState> : (
        <div className="grid gap-3 sm:grid-cols-2">
          {rows.map((c) => (
            <Card key={c.id} className="flex flex-col gap-2 border-gold/60">
              <div className="flex items-center justify-between gap-2">
                <Badge tone="gold">{CERTIFICATE_KIND[c.kind]}</Badge>
                {c.revoked_at && <Badge tone="red">ملغاة</Badge>}
              </div>
              <h2 className="text-lg font-bold text-brand-900">{c.title}</h2>
              <p className="text-sm text-muted">{formatDate(c.issued_on)} · <span dir="ltr" className="font-mono">{c.serial}</span></p>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/verify/${c.serial}`} className="font-semibold text-brand-800 underline">عرض ومشاركة</Link>
                <form action={setCertificateVisibilityAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="show" value={c.show_name_publicly ? "0" : "1"} />
                  <Button type="submit" variant="ghost" className="text-sm">
                    {c.show_name_publicly ? "إخفاء اسمي في صفحة التحقق" : "إظهار اسمي في صفحة التحقق"}
                  </Button>
                </form>
              </div>
              {!c.revoked_at && <Reactions entityType="certificate" entityId={c.id} summary={reactions[c.id]} />}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
