import Link from "next/link";
import { Button, ButtonLink, Card, cx } from "@/components/ui";
import type { CurrentUser } from "@/lib/auth";
import { CONTEXT_LABELS, type ContextKey } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { dismissOnboardingAction } from "../feature-actions";
import { SummaryChips } from "@/components/motivation/SummaryChips";
import { Crescent, Skyline } from "@/components/brand/Skyline";
import { todayDates } from "@/lib/time";
import type { MemberSummary } from "@/lib/data/summary";

const THEME: Partial<Record<ContextKey, { action: { href: string; label: string } }>> = {
  student: { action: { href: "/dashboard/schedule", label: "جدولي الأسبوعي" } },
  quran_teacher: { action: { href: "/dashboard/teacher/schedule", label: "جلسات الأسبوع" } },
  parent: { action: { href: "/dashboard/children", label: "تقدّم الأبناء" } },
  platform_admin: { action: { href: "/dashboard/admin/tickets", label: "البلاغات المفتوحة" } },
};

/** Greeting hero: dawn sky over a mosque skyline, the date in both calendars, and the member's summary. */
export function WelcomeCard({ user, summary, avatar }: { user: CurrentUser; summary?: MemberSummary | null; avatar?: string | null }) {
  const ctx = user.activeContext;
  const theme = (ctx && THEME[ctx]) || { action: { href: "/dashboard/profile", label: "حسابي" } };
  const name = user.displayName || user.fullName;
  const d = todayDates();
  return (
    <section className="dawn flex flex-col gap-4 p-5 pb-8 sm:p-6 sm:pb-10" aria-label="الترحيب">
      <Skyline />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 rounded-full bg-panel/70 px-3 py-1 text-sm font-bold text-gold-dark shadow-[var(--shadow-1)]">
          <Crescent className="size-4" />{d.hijri}
          <span className="font-normal text-muted">· {d.gregorian}</span>
        </p>
        {ctx && <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900">{CONTEXT_LABELS[ctx]}</span>}
      </div>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {avatar ? <img src={avatar} alt="" className="size-16 shrink-0 rounded-full border-[3px] border-panel object-cover shadow-[var(--shadow-2)]" />
          : <span className="grid size-16 shrink-0 place-items-center rounded-full border-[3px] border-panel bg-brand-100 text-2xl font-bold text-brand-900 shadow-[var(--shadow-2)]" aria-hidden>{name.trim().charAt(0)}</span>}
        <div className="min-w-0">
          <p className="text-sm text-muted">السلام عليكم ورحمة الله</p>
          <h1 className="text-2xl font-bold leading-tight text-brand-900 sm:text-[1.75rem]">{name}</h1>
        </div>
      </div>
      {summary && <SummaryChips s={summary} tone="hero" />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gold-dark">رحلتك مع القرآن</p>
        <ButtonLink href={theme.action.href} variant="primary">{theme.action.label}</ButtonLink>
      </div>
    </section>
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
