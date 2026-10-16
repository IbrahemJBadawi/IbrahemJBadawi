import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotConfigured } from "@/components/NotConfigured";
import { Alert, Badge, ButtonLink, Card } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { formatSchedule } from "@/lib/format";
import { AUDIENCE, JOIN_POLICY, LEVEL, MEETING_MODE, MEMBERSHIP_STATUS } from "@/lib/labels";
import { createClient, createPublicClient } from "@/lib/supabase/server";
import type { PublicHalaqa } from "@/lib/types";
import { JoinForm } from "./JoinForm";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string): Promise<PublicHalaqa | null> {
  if (!UUID.test(id) || !isSupabaseConfigured) return null;
  const { data } = await createPublicClient().rpc("get_public_halaqa", { p_id: id });
  return ((data ?? []) as PublicHalaqa[])[0] ?? null;
}

export async function generateMetadata({ params }: PageProps<"/halaqat/[id]">): Promise<Metadata> {
  const h = await load((await params).id);
  return { title: h ? h.name : "الحلقة" };
}

export default async function HalaqaDetailsPage({ params }: PageProps<"/halaqat/[id]">) {
  if (!isSupabaseConfigured) return <NotConfigured />;
  const { id } = await params;
  const h = await load(id);
  if (!h) notFound();

  const user = await getCurrentUser();
  let membership: { status: string; role: string } | null = null;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("halaqa_memberships")
      .select("status, role")
      .eq("halaqa_id", id)
      .eq("user_id", user.id)
      .in("status", ["pending", "active"])
      .maybeSingle();
    membership = data;
  }
  const full = h.active_students >= h.max_students;
  const schedule = formatSchedule(h.schedule);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <div>
          <p className="text-sm text-muted"><Link href="/halaqat" className="underline">الحلقات</Link> / تفاصيل</p>
          <h1 className="mt-1 text-2xl font-bold text-brand-900">{h.name}</h1>
          <p className="mt-1 text-muted">
            {h.is_independent ? "حلقة مستقلة" : <>تابعة لـ <span className="font-semibold text-ink">{h.center_name}</span></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="green">{MEETING_MODE[h.meeting_mode]}</Badge>
          <Badge>{LEVEL[h.level]}</Badge>
          <Badge>{AUDIENCE[h.audience_gender]}</Badge>
          {(h.age_min || h.age_max) && <Badge>العمر {h.age_min ?? "؟"}–{h.age_max ?? "؟"}</Badge>}
          <Badge tone="gold">{JOIN_POLICY[h.join_policy]}</Badge>
        </div>
        {h.description && (
          <Card>
            <h2 className="mb-2 font-bold">عن الحلقة</h2>
            <p className="whitespace-pre-line text-ink">{h.description}</p>
          </Card>
        )}
        <Card>
          <h2 className="mb-2 font-bold">المواعيد</h2>
          {schedule.length ? (
            <ul className="list-inside list-disc text-ink">{schedule.map((s) => <li key={s}>{s}</li>)}</ul>
          ) : (
            <p className="text-muted">يحدّد المحفّظ المواعيد مع الطلاب.</p>
          )}
          <p className="mt-2 text-sm text-muted">المنطقة الزمنية: <span dir="ltr">{h.timezone}</span></p>
          {h.location_text && <p className="mt-1 text-sm text-muted">المكان: {h.location_text}</p>}
        </Card>
        <Card>
          <h2 className="mb-2 font-bold">المحفّظ</h2>
          <p className="font-semibold">{h.teacher_name}</p>
          {h.teacher_bio && <p className="mt-1 whitespace-pre-line text-muted">{h.teacher_bio}</p>}
        </Card>
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="flex flex-col gap-3">
          <p className="text-lg font-bold">{h.active_students} / {h.max_students} طالب</p>
          {membership ? (
            <Alert tone="info">
              {membership.role !== "student" ? (
                <>أنت ضمن فريق هذه الحلقة.</>
              ) : membership.status === "pending" ? (
                <>طلبك قيد المراجعة لدى المحفّظ، وسيصلك إشعار بالقرار.</>
              ) : (
                <>حالة عضويتك: {MEMBERSHIP_STATUS[membership.status]}</>
              )}
            </Alert>
          ) : full ? (
            <Alert tone="warning">اكتمل عدد الطلاب في هذه الحلقة.</Alert>
          ) : h.join_policy === "invite_only" ? (
            <Alert tone="info">الانضمام إلى هذه الحلقة بالدعوة فقط.</Alert>
          ) : !user ? (
            <ButtonLink href={`/login?next=/halaqat/${h.id}`}>سجّل الدخول للانضمام</ButtonLink>
          ) : !user.roles.includes("student") ? (
            <Alert tone="info">
              الانضمام متاح لحساب الطالب. أضف دور الطالب من <Link href="/dashboard/profile" className="font-semibold underline">صفحة حسابي</Link>.
            </Alert>
          ) : (
            <JoinForm halaqaId={h.id} needsApproval={h.join_policy === "approval"} />
          )}
        </Card>
      </aside>
    </div>
  );
}
