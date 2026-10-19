import "server-only";
import { asUser } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";

export type NotificationRow = {
  id: string; kind: string; title_ar: string; body_ar: string | null; link: string | null; is_read: boolean; created_at: string;
};
export type CategoryPref = {
  kind: string; title_ar: string; detail_ar: string | null; is_mandatory: boolean; in_app: boolean; email: boolean;
};

export async function unreadCount(user: CurrentUser) {
  const [r] = await asUser(user, (tx) => tx.query<{ n: number }>("select count(*)::int as n from public.notifications where user_id = $1 and not is_read", [user.id]));
  return r?.n ?? 0;
}

export async function listNotifications(user: CurrentUser, limit = 50) {
  return asUser(user, (tx) =>
    tx.query<NotificationRow>(
      "select id, kind, title_ar, body_ar, link, is_read, created_at::text from public.notifications where user_id = $1 order by created_at desc limit $2",
      [user.id, limit],
    ),
  );
}

/** Categories relevant to this user (admin categories only for admins) with effective preferences. */
export async function notificationPrefs(user: CurrentUser) {
  return asUser(user, (tx) =>
    tx.query<CategoryPref>(
      `select c.kind, c.title_ar, c.detail_ar, c.is_mandatory,
              coalesce(p.in_app, true) as in_app, coalesce(p.email, c.email_default) as email
       from public.notification_categories c
       left join public.notification_preferences p on p.kind = c.kind and p.user_id = $1
       where (not c.admin_only or $2) order by c.sort_order`,
      [user.id, user.role === "admin"],
    ),
  );
}
