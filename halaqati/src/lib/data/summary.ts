import "server-only";
import { getMotivation, type LeagueRow } from "@/lib/data/motivation";
import { LEVEL } from "@/lib/labels";
import { levelFor } from "@/lib/levels";
import type { createClient } from "@/lib/supabase/server";
import type { StudentOverview } from "@/lib/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** The same six facts for every member, wherever they are shown. */
export type MemberSummary = {
  level: ReturnType<typeof levelFor>;
  program: string | null;
  pointsTotal: number;
  pointsWeek: number;
  streak: number;
  quality: number | null;
  rank: { rank: number; of: number } | null;
};

const quality = (mastery: number | null | undefined, recitation: number | null | undefined) => {
  const xs = [mastery, recitation].filter((x): x is number => typeof x === "number" && !Number.isNaN(Number(x))).map(Number);
  return xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
};

/** For the student themself or a linked parent (RLS and the RPCs enforce both). */
export async function studentSummary(supabase: Supa, studentId: string, self: boolean): Promise<MemberSummary | null> {
  const [motivation, memberships, overview] = await Promise.all([
    getMotivation(supabase, self ? undefined : studentId),
    supabase.from("halaqa_memberships").select("halaqa_id, halaqat(name, level)").eq("user_id", studentId).eq("role", "student").eq("status", "active")
      .order("created_at", { ascending: true }).limit(5),
    supabase.rpc("get_student_overview", { p_student: studentId, p_days: 30 }),
  ]);
  if (!motivation) return null;
  const first = ((memberships.data ?? []) as unknown as Array<{ halaqa_id: string; halaqat: { name: string; level: string } | null }>)[0];
  let rank: MemberSummary["rank"] = null;
  if (first) {
    const { data } = await supabase.rpc("get_halaqa_league", { p_halaqa: first.halaqa_id, p_period: "week" });
    const rows = (data ?? []) as LeagueRow[];
    const me = rows.find((r) => r.student_id === studentId);
    if (me) rank = { rank: Number(me.rank), of: rows.length };
  }
  const o = overview.data as StudentOverview | null;
  return {
    level: levelFor(motivation.points_total),
    program: first?.halaqat ? `${first.halaqat.name} · ${LEVEL[first.halaqat.level] ?? ""}` : null,
    pointsTotal: motivation.points_total,
    pointsWeek: motivation.points_week,
    streak: motivation.current_streak,
    quality: quality(o?.mastery_avg, o?.recitation_avg),
    rank,
  };
}

export type HalaqaMemberRow = {
  student_id: string; points_total: number; points_week: number; current_streak: number;
  week_rank: number; members: number; mastery_avg: number | null; recitation_avg: number | null;
};

/** For a halaqa's staff: every active student in one call. */
export async function halaqaSummaries(supabase: Supa, halaqaId: string, program: string): Promise<Map<string, MemberSummary>> {
  const { data } = await supabase.rpc("get_halaqa_member_summaries", { p_halaqa: halaqaId });
  const out = new Map<string, MemberSummary>();
  for (const r of (data ?? []) as HalaqaMemberRow[]) {
    out.set(r.student_id, {
      level: levelFor(Number(r.points_total)),
      program,
      pointsTotal: Number(r.points_total),
      pointsWeek: Number(r.points_week),
      streak: Number(r.current_streak),
      quality: quality(r.mastery_avg, r.recitation_avg),
      rank: { rank: Number(r.week_rank), of: Number(r.members) },
    });
  }
  return out;
}
