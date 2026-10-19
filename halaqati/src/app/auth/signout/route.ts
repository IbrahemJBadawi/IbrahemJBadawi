import { localRedirect } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const res = localRedirect("/", 303);
  res.cookies.delete("halaqati_ctx");
  return res;
}
