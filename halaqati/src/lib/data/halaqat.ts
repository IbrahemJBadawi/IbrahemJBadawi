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
