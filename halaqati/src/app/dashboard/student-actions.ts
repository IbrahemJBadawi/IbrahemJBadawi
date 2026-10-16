"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/common";

export async function leaveHalaqaAction(fd: FormData) {
  await requireUser();
  const id = uuid.safeParse(fd.get("halaqaId"));
  if (!id.success) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_halaqa", { p_halaqa: id.data });
  revalidatePath("/dashboard/halaqat");
  if (error) redirect(`/dashboard/halaqat?error=${encodeURIComponent(toUserMessage(error))}`);
}
