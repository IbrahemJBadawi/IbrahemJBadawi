import type { Metadata } from "next";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { RELATIONSHIP } from "@/lib/labels";
import { CONTEXT_LABELS, SELF_SERVICE_ROLES } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { cancelPrivacyRequestAction } from "../actions";
import { LinkCodeGenerator, PrivacyRequestForm, ProfileForm, RoleToggle } from "./ProfileForms";
import { revokeLinkAction } from "./parent-link-actions";
import { VerificationForm } from "./VerificationForm";
import { REVIEW_STATUS } from "@/lib/labels";
import { ImageUpload } from "@/components/images/ImageUpload";
import { loadImages } from "@/lib/data/images";
import { setPhotoOnCertificatesAction } from "../image-actions";

export const metadata: Metadata = { title: "حسابي" };

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const isTeacher = user.roles.includes("quran_teacher") || user.roles.includes("instructor");
  const [profileRes, detailsRes, parentsRes, privacyRes, verifRes] = await Promise.all([
    supabase.from("profiles").select("full_name, display_name, bio, directory_visible, verified_teacher_at").eq("id", user.id).single(),
    supabase.from("profile_details").select("gender, birth_year, country, city").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("parent_student_links")
      .select("id, relationship, created_at, profiles!parent_student_links_parent_id_fkey(full_name)")
      .eq("student_id", user.id)
      .eq("status", "active"),
    supabase.from("privacy_requests").select("id, kind, status, created_at").order("created_at", { ascending: false }).limit(10),
    supabase.from("verification_requests").select("id, status, review_note, created_at").order("created_at", { ascending: false }).limit(1),
  ]);
  const [images, { data: photoPref }] = await Promise.all([
    loadImages(supabase, "profile", [user.id]),
    supabase.from("profiles").select("photo_on_certificates").eq("id", user.id).single(),
  ]);
  const photoOnCerts = Boolean(photoPref?.photo_on_certificates);
  const verifiedAt = (profileRes.data as { verified_teacher_at?: string | null } | null)?.verified_teacher_at ?? null;
  const lastVerif = verifRes.data?.[0] ?? null;
  const p = { ...(profileRes.data ?? { full_name: user.fullName, display_name: null, bio: null, directory_visible: false }), ...(detailsRes.data ?? { gender: null, birth_year: null, country: null, city: null }) };
  const parents = (parentsRes.data ?? []) as unknown as Array<{ id: string; relationship: string; created_at: string; profiles: { full_name: string } | null }>;
  const privacy = privacyRes.data ?? [];
  const openKinds = new Set(privacy.filter((r) => r.status === "pending" || r.status === "processing").map((r) => r.kind));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="حسابي" description={user.email ?? undefined} />

      <Card>
        <h2 className="mb-3 text-lg font-bold text-brand-800">صورتي</h2>
        <ImageUpload type="profile" id={user.id} current={images.get(user.id) ?? null} label="صورتي" />
        {user.roles.includes("student") && (
          <form action={setPhotoOnCertificatesAction} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-sm text-muted">{photoOnCerts ? "تظهر صورتك على شهاداتك (عند إظهار اسمك فيها)." : "صورتك لا تظهر على الشهادات."}</p>
            <input type="hidden" name="on" value={photoOnCerts ? "0" : "1"} />
            <Button type="submit" variant="secondary">{photoOnCerts ? "إخفاء صورتي من الشهادات" : "إظهار صورتي على الشهادات"}</Button>
          </form>
        )}
        <p className="mt-2 text-xs text-muted">يرى صورتك أنت ووليّ أمرك ومحفّظوك وزملاء حلقتك فقط. صور المحفّظين يراها المسجّلون.</p>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-bold text-brand-800">البيانات الشخصية</h2>
        <ProfileForm p={p} />
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-bold text-brand-800">أدواري</h2>
        <p className="mb-3 text-sm text-muted">
          الأدوار الحالية: {user.contexts.map((c) => <Badge key={c} tone="green">{CONTEXT_LABELS[c]}</Badge>)}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SELF_SERVICE_ROLES.map((r) => <RoleToggle key={r} role={r} has={user.roles.includes(r)} />)}
        </div>
        <p className="mt-3 text-sm text-muted">أدوار الإدارة (أمير مركز، مدير دار، إدارة المنصة) تُمنح عبر المؤسسة أو إدارة المنصة ولا تُضاف ذاتيًا.</p>
      </Card>

      {isTeacher && (
        <Card id="verification">
          <h2 className="mb-1 text-lg font-bold text-brand-800">توثيق المحفّظ ✓</h2>
          {verifiedAt ? (
            <p className="text-brand-900">حسابك موثّق منذ {formatDate(verifiedAt)}، وتظهر علامة ✓ بجانب اسمك في الحلقات والدليل.</p>
          ) : lastVerif?.status === "pending" ? (
            <p className="text-muted">طلبك قيد المراجعة لدى إدارة المنصة.</p>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted">
                يزيد التوثيق ثقة أولياء الأمور، وتظهر حلقاتك أولًا في نتائج البحث.
                {lastVerif && <> آخر طلب: {REVIEW_STATUS[lastVerif.status]}{lastVerif.review_note ? ` — ${lastVerif.review_note}` : ""}.</>}
              </p>
              <VerificationForm />
            </>
          )}
        </Card>
      )}

      {user.roles.includes("student") && (
        <Card>
          <h2 className="mb-1 text-lg font-bold text-brand-800">ربط وليّ الأمر</h2>
          <p className="mb-3 text-sm text-muted">لن يطّلع أي وليّ أمر على بياناتك إلا بعد أن تعطيه رمز الربط بنفسك. يمكنك إلغاء الربط في أي وقت.</p>
          {parents.length > 0 && (
            <ul className="mb-3 divide-y divide-line">
              {parents.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                  <span>{l.profiles?.full_name} <span className="text-sm text-muted">({RELATIONSHIP[l.relationship]}) منذ {formatDate(l.created_at)}</span></span>
                  <form action={revokeLinkAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <Button type="submit" variant="ghost">إلغاء الربط</Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <LinkCodeGenerator />
        </Card>
      )}

      <Card>
        <h2 className="mb-1 text-lg font-bold text-brand-800">الخصوصية</h2>
        <p className="mb-3 text-sm text-muted">تُراجع إدارة المنصة الطلبات يدويًا وتتواصل معك عبر بريدك.</p>
        {privacy.length > 0 && (
          <ul className="mb-3 divide-y divide-line text-sm">
            {privacy.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span>{r.kind === "delete" ? "حذف الحساب" : "نسخة من البيانات"} — {r.status === "pending" ? "قيد الانتظار" : r.status === "processing" ? "قيد التنفيذ" : r.status === "completed" ? "مكتمل" : "مغلق"} ({formatDate(r.created_at)})</span>
                {r.status === "pending" && (
                  <form action={cancelPrivacyRequestAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="ghost">إلغاء</Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {!openKinds.has("export") && <PrivacyRequestForm kind="export" label="طلب نسخة من بياناتي" />}
          {!openKinds.has("delete") && <PrivacyRequestForm kind="delete" label="طلب حذف حسابي" />}
        </div>
      </Card>
    </div>
  );
}
