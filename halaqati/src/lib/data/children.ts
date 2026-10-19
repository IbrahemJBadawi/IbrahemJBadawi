import "server-only";
import { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type ChildLink = {
  id: string;
  student_id: string;
  relationship: string;
  created_at: string;
  profiles: { full_name: string; display_name: string | null } | null;
};

export async function myChildren(supabase: Supa, parentId: string) {
  const { data, error } = await supabase
    .from("parent_student_links")
    .select("id, student_id, relationship, created_at, profiles!parent_student_links_student_id_fkey(full_name, display_name)")
    .eq("parent_id", parentId)
    .eq("status", "active")
    .order("created_at")
    .limit(30);
  return { rows: (data ?? []) as unknown as ChildLink[], error };
}
