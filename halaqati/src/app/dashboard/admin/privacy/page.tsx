import type { Metadata } from "next";
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader } from "@/components/ui";
import { requireContext } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { adminUpdatePrivacyAction } from "../actions";

export const metadata: Metadata = { title: "طلبات الخصوصية" };

type Req = { id: string; full_name: string; email: string; kind: "export" | "delete"; status: string; reason: string | null; admin_notes: string | null; created_at: string };
const STATUS: Record<string, string> = { pending: "قيد الانتظار", processing: "قيد التنفيذ", completed: "مكتمل", rejected: "مغلق" };

export default async function AdminPrivacyPage() {
  await requireContext("platform_admin");
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_privacy_requests", { p_limit: 50, p_offset: 0 });
  const rows = (data ?? []) as Req[];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="طلبات الخصوصية" />
      <Alert tone="info">
        تنفيذ الحذف يتم من لوحة Supabase (Authentication → Users → Delete) بعد التحقق من الهوية؛ حذف المستخدم يحذف ملفه وسجلاته كطالب تلقائيًا.
        إذا كان محفّظًا مسؤولًا عن حلقات فانقل المسؤولية أو أنهِ الحلقات أولًا. راجع docs/OPERATIONS.md.
      </Alert>
      {rows.length === 0 ? <EmptyState title="لا توجد طلبات" /> : rows.map((r) => (
        <Card key={r.id} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-bold">{r.kind === "delete" ? "حذف حساب" : "نسخة من البيانات"} — {r.full_name}</p>
              <p className="text-sm text-muted" dir="ltr">{r.email}</p>
              <p className="text-sm text-muted">{formatDate(r.created_at)}</p>
            </div>
            <Badge tone={r.status === "completed" ? "green" : r.status === "rejected" ? "gray" : "gold"}>{STATUS[r.status]}</Badge>
          </div>
          {r.reason && <p className="text-muted">السبب: {r.reason}</p>}
          {r.admin_notes && <p className="text-sm text-muted">ملاحظات: {r.admin_notes}</p>}
          {(r.status === "pending" || r.status === "processing") && (
            <form action={adminUpdatePrivacyAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={r.id} />
              <Input name="notes" placeholder="ملاحظة داخلية" className="sm:max-w-xs" aria-label="ملاحظة" />
              {r.status === "pending" && <Button type="submit" name="status" value="processing" variant="secondary">بدء التنفيذ</Button>}
              <Button type="submit" name="status" value="completed">تم التنفيذ</Button>
              <Button type="submit" name="status" value="rejected" variant="ghost">رفض</Button>
            </form>
          )}
        </Card>
      ))}
    </div>
  );
}
