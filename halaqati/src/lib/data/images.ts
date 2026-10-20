import "server-only";
import type { createClient } from "@/lib/supabase/server";

type Supa = Awaited<ReturnType<typeof createClient>>;

/** Images the viewer may see, keyed by entity id (the database applies the visibility rules). */
export async function loadImages(supabase: Supa, type: "profile" | "center" | "organization", ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(ids)].slice(0, 200);
  if (unique.length === 0) return out;
  const { data } = await supabase.rpc("get_entity_images", { p_type: type, p_ids: unique });
  for (const r of (data ?? []) as Array<{ entity_id: string; data: string }>) out.set(r.entity_id, r.data);
  return out;
}
