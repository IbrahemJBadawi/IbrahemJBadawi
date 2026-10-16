import Link from "next/link";
import { Alert, Card } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { CONTEXT_LABELS } from "@/lib/roles";
import { AdminHome } from "./_home/AdminHome";
import { ParentHome } from "./_home/ParentHome";
import { StudentHome } from "./_home/StudentHome";
import { OnboardingChecklist, WelcomeCard } from "./_home/Welcome";
import { TeacherHome } from "./_home/TeacherHome";
import { studentSummary } from "@/lib/data/summary";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const sp = await searchParams;
  const banner = sp.password === "updated" ? <div className="mb-4"><Alert tone="success">تم تحديث كلمة المرور.</Alert></div> : null;
  const ctx = user.activeContext;

  let body: React.ReactNode;
  if (!ctx) {
    body = (
      <Card>
        <h1 className="mb-2 text-xl font-bold">مرحبًا بك</h1>
        <p className="text-muted">لا يوجد دور مفعّل لحسابك. أضف دورًا من <Link href="/dashboard/profile" className="font-semibold underline">صفحة حسابي</Link>.</p>
      </Card>
    );
  } else if (ctx === "student") body = <StudentHome user={user} />;
  else if (ctx === "quran_teacher") body = <TeacherHome user={user} />;
  else if (ctx === "parent") body = <ParentHome user={user} />;
  else if (ctx === "platform_admin") body = <AdminHome />;
  else {
    body = (
      <Card>
        <h1 className="mb-2 text-xl font-bold">{CONTEXT_LABELS[ctx]}</h1>
        <Alert tone="info">
          لوحة «{CONTEXT_LABELS[ctx]}» قيد التطوير ضمن المراحل القادمة، ولم تُفعَّل وظائفها بعد. يمكنك التبديل إلى دور آخر من أعلى الصفحة.
        </Alert>
      </Card>
    );
  }
  // Anyone who is also a student sees their own summary in the greeting.
  const summary = ctx && user.roles.includes("student") && (ctx === "student" || ctx === "quran_teacher" || ctx === "parent")
    ? await studentSummary(await createClient(), user.id, true)
    : null;
  return (
    <div className="flex flex-col gap-5">
      {banner}
      {ctx && <WelcomeCard user={user} summary={summary} />}
      <OnboardingChecklist user={user} />
      {body}
    </div>
  );
}
