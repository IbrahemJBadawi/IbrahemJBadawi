"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { asUser } from "@/lib/db";
import type { FormState } from "./account";

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  if (!z.uuid().safeParse(id).success) return;
  // Column grants allow only is_read/read_at; RLS limits to own rows.
  await asUser(user, (tx) => tx.query("update public.notifications set is_read = true, read_at = now() where id = $1 and user_id = $2", [id, user.id]));
  refresh();
}

/** Same as markAllReadAction, for the bell menu (no form state). */
export async function markAllReadQuick() {
  const user = await requireUser();
  await asUser(user, (tx) => tx.query("update public.notifications set is_read = true, read_at = now() where user_id = $1 and not is_read", [user.id]));
  refresh();
}

export async function markAllReadAction(): Promise<FormState> {
  const user = await requireUser();
  await asUser(user, (tx) => tx.query("update public.notifications set is_read = true, read_at = now() where user_id = $1 and not is_read", [user.id]));
  refresh();
  return { ok: true, message: "تم تعليم كل الإشعارات كمقروءة." };
}

export async function savePreferencesAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const kinds = form.getAll("kind").map(String).filter((k) => /^[a-z_]{2,40}$/.test(k)).slice(0, 30);
  await asUser(user, async (tx) => {
    for (const kind of kinds) {
      await tx.query(
        `insert into public.notification_preferences (user_id, kind, in_app, email) values ($1, $2, $3, $4)
         on conflict (user_id, kind) do update set in_app = excluded.in_app, email = excluded.email, updated_at = now()`,
        [user.id, kind, form.get(`in_app:${kind}`) === "on", form.get(`email:${kind}`) === "on"],
      );
    }
  });
  refresh();
  return { ok: true, message: "تم حفظ تفضيلات الإشعارات." };
}
