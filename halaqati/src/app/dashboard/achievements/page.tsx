import type { Metadata } from "next";
import Link from "next/link";
import { LevelCard } from "@/components/motivation/LevelCard";
import { Alert, Card, PageHeader, Stat, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getMotivation } from "@/lib/data/motivation";
import { evaluateBadges, type BadgeStats } from "@/lib/levels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "إنجازاتي" };

export default async function AchievementsPage({ searchParams }: PageProps<"/dashboard/achievements">) {
  await requireUser();
  const sp = await searchParams;
  const studentId = typeof sp.s === "string" && /^[0-9a-f-]{36}$/i.test(sp.s) ? sp.s : undefined;
  const supabase = await createClient();
  const [statsRes, motivation] = await Promise.all([
    supabase.rpc("get_my_badge_stats", studentId ? { p_student: studentId } : {}),
    getMotivation(supabase, studentId),
  ]);
  if (statsRes.error || !motivation) {
    return (<><PageHeader title="إنجازاتي" /><Alert tone="error">تعذّر تحميل الإنجازات.</Alert></>);
  }
  const stats = { ...(statsRes.data as Omit<BadgeStats, "longest_streak">), longest_streak: motivation.longest_streak } as BadgeStats;
  const badges = evaluateBadges(stats);
  const earned = badges.filter((b) => b.earned).length;
  return (
    <>
      <PageHeader title={studentId ? "إنجازات الابن" : "إنجازاتي"} description="سجلّك القرآني: المستوى والأوسمة والأرقام — من السجلات المعتمدة فقط." />
      <div className="flex flex-col gap-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Card><LevelCard points={stats.points_total} /></Card>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="الأوسمة" value={`${earned} من ${badges.length}`} />
            <Stat label="أطول حماسة" value={`${motivation.longest_streak} يوم`} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="تسميعات معتمدة" value={stats.recitations} />
          <Stat label="آيات حفظ جديد" value={stats.new_ayat} />
          <Stat label="جلسات حضرتها" value={stats.attended} />
          <Stat label="شهادات" value={stats.certificates} />
        </div>
        <section aria-labelledby="badges-h">
          <h2 id="badges-h" className="mb-3 text-lg font-bold">الأوسمة</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {badges.map((b) => (
              <li key={b.key} className="surface flex flex-col items-center gap-1 p-4 text-center">
                <span className={cx("hex", b.earned ? "is-earned" : "is-locked")} aria-hidden>{b.icon}</span>
                <p className="font-bold">{b.title}</p>
                <p className="text-xs text-muted">{b.hint}</p>
                {b.earned ? <p className="text-sm font-semibold text-brand-800">✓ حصلت عليه</p> : (
                  <div className="mt-1 w-full">
                    <div className="progress-track" role="progressbar" aria-valuenow={b.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`التقدّم نحو ${b.title}`}><div className="progress-fill" style={{ width: `${b.progress}%` }} /></div>
                    <p className="mt-1 text-xs text-muted tabular-nums">{b.value} من {b.goal}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
        <p className="text-sm text-muted"><Link href="/dashboard/guide" className="font-semibold text-brand-800">دليل النقاط والمستويات ←</Link></p>
      </div>
    </>
  );
}
