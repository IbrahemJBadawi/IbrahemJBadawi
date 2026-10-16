import Link from "next/link";
import { Button, ButtonLink, Card, cx } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { CONTEXT_LABELS, type ContextKey } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { dismissOnboardingAction } from "../feature-actions";

const THEME: Partial<Record<ContextKey, { bg: string; action: { href: string; label: string } }>> = {
  student: { bg: "bg-brand-800", action: { href: "/dashboard/schedule", label: "جدولي الأسبوعي" } },
  quran_teacher: { bg: "bg-brand-900", action: { href: "/dashboard/teacher/schedule", label: "جلسات الأسبوع" } },
  parent: { bg: "bg-[#5b4a1f]", action: { href: "/dashboard/children", label: "تقدّم الأبناء" } },
  platform_admin: { bg: "bg-ink", action: { href: "/dashboard/admin/tickets", label: "البلاغات المفتوحة" } },
};

/** Role-coloured greeting with the single most useful action for that role. */
export function WelcomeCard({ user, streak }: { user: CurrentUser; streak?: number | null }) {
  const ctx = user.activeContext;
  const theme = (ctx && THEME[ctx]) || { bg: "bg-brand-800", action: { href: "/dashboard/profile", label: "حسابي" } };
  return (
    <div className={cx("flex flex-col gap-3 rounded-2xl px-5 py-5 text-white sm:flex-row sm:items-end sm:justify-between", theme.bg)}>
      <div>
        <p className="text-sm text-white/80">السلام عليكم 👋 · {ctx ? CONTEXT_LABELS[ctx] : ""}</p>
        <h1 className="text-2xl font-bold">{user.displayName || user.fullName}</h1>
        <p className="mt-1 text-sm text-gold">
          رحلتك مع القرآن{typeof streak === "number" && streak > 0 && <> · سلسلة الالتزام: {streak} أسبوع متتالٍ 🔥</>}
        </p>
      </div>
      <ButtonLink href={theme.action.href} className="!bg-white !text-brand-900 hover:!bg-ivory">{theme.action.label}</ButtonLink>
    </div>
  );
}

type Step = { label: string; done: boolean; href: string };

/** First-steps checklist, shown until done or dismissed. */
export async function OnboardingChecklist({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("display_name, bio, onboarding_dismissed_at, verified_teacher_at").eq("id", user.id).single();
  if (!profile || profile.onboarding_dismissed_at) return null;
  const { data: details } = await supabase.from("profile_details").select("birth_year, city, gender").eq("user_id", user.id).maybeSingle();
  const steps: Step[] = [
    { label: "أكمل بياناتك الشخصية", done: Boolean(profile.display_name || profile.bio || details?.city || details?.birth_year), href: "/dashboard/profile" },
  ];
  if (user.roles.includes("student")) {
    const { count } = await supabase.from("halaqa_memberships").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("role", "student").in("status", ["pending", "active"]);
    steps.push({ label: "انضم إلى حلقة", done: (count ?? 0) > 0, href: "/halaqat" });
  }
  if (user.roles.includes("quran_teacher")) {
    const { data: hs } = await supabase.from("halaqat").select("status").eq("teacher_id", user.id).is("deleted_at", null);
    steps.push({ label: "أنشئ حلقتك الأولى", done: (hs ?? []).length > 0, href: "/dashboard/teacher/halaqat/new" });
    steps.push({ label: "انشر الحلقة ليراها الطلاب", done: (hs ?? []).some((h) => h.status === "published"), href: "/dashboard/teacher/halaqat" });
    const { count } = await supabase.from("verification_requests").select("id", { count: "exact", head: true }).eq("user_id", user.id);
    steps.push({ label: "اطلب توثيق حسابك ✓", done: Boolean(profile.verified_teacher_at) || (count ?? 0) > 0, href: "/dashboard/profile#verification" });
  }
  if (user.roles.includes("parent")) {
    const { count } = await supabase.from("parent_student_links").select("id", { count: "exact", head: true }).eq("parent_id", user.id).eq("status", "active");
    steps.push({ label: "اربط حساب ابنك", done: (count ?? 0) > 0, href: "/dashboard/children" });
  }
  const done = steps.filter((s) => s.done).length;
  if (done === steps.length) return null;
  return (
    <Card className="border-gold/60">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-bold text-brand-800">خطواتك الأولى ({done}/{steps.length})</h2>
        <form action={dismissOnboardingAction}><Button type="submit" variant="ghost" className="!min-h-9 text-sm">إخفاء</Button></form>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={steps.length} aria-label="تقدّم الخطوات">
        <div className="h-full bg-brand-600" style={{ width: `${(done / steps.length) * 100}%` }} />
      </div>
      <ul className="flex flex-col gap-1.5">
        {steps.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span aria-hidden className={cx("flex size-6 items-center justify-center rounded-full text-sm", s.done ? "bg-brand-600 text-white" : "border border-line")}>{s.done ? "✓" : ""}</span>
            {s.done ? <span className="text-muted line-through">{s.label}</span> : <Link href={s.href} className="font-semibold text-brand-800 underline">{s.label}</Link>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
