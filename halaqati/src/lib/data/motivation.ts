import type { SupabaseClient } from "@supabase/supabase-js";

export type Motivation = {
  current_streak: number;
  longest_streak: number;
  active_today: boolean;
  points_total: number;
  points_week: number;
  wird_today: number | null;
  last7: Array<{ day: string; points: number }>;
};

export async function getMotivation(supabase: SupabaseClient, studentId?: string): Promise<Motivation | null> {
  const { data, error } = await supabase.rpc("get_my_motivation", studentId ? { p_student: studentId } : {});
  if (error || !data) return null;
  return data as Motivation;
}

export type ReactionKind = "mashallah" | "barakallah" | "clap" | "star" | "heart";
export const REACTION_KINDS: ReactionKind[] = ["mashallah", "barakallah", "clap", "star", "heart"];
export const REACTION_LABELS: Record<ReactionKind, { emoji: string; label: string }> = {
  mashallah: { emoji: "🌿", label: "ما شاء الله" },
  barakallah: { emoji: "🤲", label: "بارك الله فيك" },
  clap: { emoji: "👏", label: "أحسنت" },
  star: { emoji: "⭐", label: "نجمة" },
  heart: { emoji: "❤️", label: "أحببته" },
};

export type ReactionSummary = Partial<Record<ReactionKind, { count: number; mine: boolean }>>;

/** Reaction counts for many entities in one query (RLS limits rows to what the viewer may see). */
export async function loadReactions(
  supabase: SupabaseClient,
  entityType: "progress_record" | "certificate",
  ids: string[],
  viewerId: string,
): Promise<Record<string, ReactionSummary>> {
  const out: Record<string, ReactionSummary> = {};
  if (ids.length === 0) return out;
  const { data } = await supabase.from("reactions").select("entity_id, kind, user_id").eq("entity_type", entityType).in("entity_id", ids);
  for (const r of data ?? []) {
    const s = (out[r.entity_id] ??= {});
    const k = r.kind as ReactionKind;
    const cur = (s[k] ??= { count: 0, mine: false });
    cur.count += 1;
    if (r.user_id === viewerId) cur.mine = true;
  }
  return out;
}

export type LeagueRow = { rank: number; student_id: string; name: string; points: number; is_me: boolean };
