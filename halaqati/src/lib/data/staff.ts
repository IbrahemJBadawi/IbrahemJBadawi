import "server-only";
import type { CurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Halaqa } from "@/lib/types";

type Supa = Awaited<ReturnType<typeof createClient>>;

/**
 * Loads a halaqa for its staff. Returns null for anyone else so pages can
 * 404 (UI gate — the database enforces the same rule on every query).
 */
export async function loadHalaqaForStaff(supabase: Supa, user: CurrentUser, halaqaId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(halaqaId)) return null;
  const [{ data: h }, { data: me }] = await Promise.all([
    supabase.from("halaqat").select("*").eq("id", halaqaId).is("deleted_at", null).maybeSingle(),
    supabase
      .from("halaqa_memberships")
      .select("role")
      .eq("halaqa_id", halaqaId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .in("role", ["teacher", "assistant"])
      .maybeSingle(),
  ]);
  if (!h) return null;
  const halaqa = h as Halaqa;
  const isManager = halaqa.teacher_id === user.id || user.centers.some((c) => c.id === halaqa.center_id && c.role === "admin");
  if (!me && !isManager) return null;
  return { halaqa, isManager };
}
