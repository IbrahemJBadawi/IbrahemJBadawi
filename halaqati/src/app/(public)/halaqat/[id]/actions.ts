"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { toUserMessage } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { optionalText, uuid, type FormState } from "@/lib/validation/common";

const joinSchema = z.object({ halaqaId: uuid, message: optionalText(500) });

export async function requestJoinAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "سجّل الدخول أولًا." };
  const parsed = joinSchema.safeParse({ halaqaId: fd.get("halaqaId"), message: fd.get("message") ?? undefined });
  if (!parsed.success) return { ok: false, error: "بيانات غير صحيحة." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_join_halaqa", {
    p_halaqa: parsed.data.halaqaId,
    p_message: parsed.data.message,
  });
  if (error) return { ok: false, error: toUserMessage(error) };
  revalidatePath(`/halaqat/${parsed.data.halaqaId}`);
  revalidatePath("/dashboard/halaqat");
  return {
    ok: true,
    message: (data as { status: string }).status === "active" ? "تم انضمامك إلى الحلقة." : "تم إرسال طلبك إلى المحفّظ، وسيصلك إشعار بالقرار.",
  };
}
