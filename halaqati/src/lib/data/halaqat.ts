import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Halaqa } from "@/lib/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type MembershipWithHalaqa = {
  id: string;
  halaqa_id: string;
  role: "teacher" | "assistant" | "student";
  status: string;
  created_at: string;
  halaqat: Pick<Halaqa, "id" | "name" | "status" | "timezone" | "meeting_mode" | "teacher_id"> | null;
};

/** Halaqat the user belongs to as a student (pending or active). */
export async function studentMemberships(supabase: Supa, userId: string, statuses = ["pending", "active"]) {
  const { data, error } = await supabase
    .from("halaqa_memberships")
    .select("id, halaqa_id, role, status, created_at, halaqat(id, name, status, timezone, meeting_mode, teacher_id)")
    .eq("user_id", userId)
    .eq("role", "student")
    .in("status", statuses)
    .order("created_at", { ascending: false })
    .limit(50);
  return { rows: (data ?? []) as unknown as MembershipWithHalaqa[], error };
}

/** Halaqat the user teaches or assists (active staff membership). */
export async function staffHalaqat(supabase: Supa, userId: string) {
  const { data, error } = await supabase
    .from("halaqa_memberships")
    .select("id, halaqa_id, role, status, created_at, halaqat(id, name, status, timezone, meeting_mode, teacher_id)")
    .eq("user_id", userId)
    .in("role", ["teacher", "assistant"])
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = ((data ?? []) as unknown as MembershipWithHalaqa[]).filter((m) => m.halaqat);
  return { rows, error };
}

export type RosterEntry = {
  id: string;
  user_id: string;
  status: string;
  role: string;
  request_message: string | null;
  created_at: string;
  joined_at: string | null;
  profiles: { full_name: string; display_name: string | null } | null;
};

export async function halaqaRoster(supabase: Supa, halaqaId: string, statuses: string[]) {
  const { data, error } = await supabase
    .from("halaqa_memberships")
    .select("id, user_id, status, role, request_message, created_at, joined_at, profiles!halaqa_memberships_user_id_fkey(full_name, display_name)")
    .eq("halaqa_id", halaqaId)
    .eq("role", "student")
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .limit(300);
  return { rows: (data ?? []) as unknown as RosterEntry[], error };
}

export function personName(p: { full_name: string; display_name: string | null } | null | undefined) {
  return p?.display_name || p?.full_name || "—";
}

export type ViewerHalaqa = { id: string; name: string; league_enabled: boolean; chat_students_can_post: boolean; is_demo: boolean; staff: boolean };

/** Halaqat the viewer may see as a member: student, staff, or parent of an active student. */
export async function viewerHalaqat(supabase: Supa, userId: string): Promise<ViewerHalaqa[]> {
  const cols = "id, name, league_enabled, chat_students_can_post, is_demo";
  const [{ data: own }, { data: kids }] = await Promise.all([
    supabase.from("halaqa_memberships").select(`role, halaqat(${cols})`).eq("user_id", userId).eq("status", "active").limit(100),
    supabase.from("parent_student_links").select("student_id").eq("parent_id", userId).eq("status", "active").limit(50),
  ]);
  type H = Omit<ViewerHalaqa, "staff">;
  const map = new Map<string, ViewerHalaqa>();
  for (const m of (own ?? []) as unknown as Array<{ role: string; halaqat: H | null }>) {
    if (m.halaqat) map.set(m.halaqat.id, { ...m.halaqat, staff: m.role !== "student" || map.get(m.halaqat.id)?.staff === true });
  }
  const kidIds = (kids ?? []).map((k) => k.student_id);
  if (kidIds.length) {
    const { data } = await supabase.from("halaqa_memberships").select(`halaqat(${cols})`).in("user_id", kidIds).eq("role", "student").eq("status", "active").limit(100);
    for (const m of (data ?? []) as unknown as Array<{ halaqat: H | null }>) {
      if (m.halaqat && !map.has(m.halaqat.id)) map.set(m.halaqat.id, { ...m.halaqat, staff: false });
    }
  }
  return [...map.values()];
}
