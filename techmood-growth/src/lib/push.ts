import "server-only";
import webpush from "web-push";
import { asSystem } from "@/lib/db";
import { env, integrations } from "@/lib/env";
import { logError } from "@/lib/errors";

/**
 * Delivers notifications not pushed yet to their owners' devices. Safe to
 * call often: each notification is claimed once (pushed_at), and dead
 * subscriptions are removed. Without VAPID keys it only marks nothing and
 * the in-app notification centre still works.
 */
export async function dispatchPush(limit = 100): Promise<number> {
  if (!integrations.push) return 0;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublic, env.vapidPrivate);
  const jobs = await asSystem((tx) =>
    tx.query<{ id: string; title: string; body: string | null; link: string | null; subs: { endpoint: string; p256dh: string; auth: string }[] }>(
      `with claimed as (
         update public.notifications n set pushed_at = now()
         where n.id in (select id from public.notifications where pushed_at is null and created_at > now() - interval '2 hours'
                        order by created_at limit $1 for update skip locked)
         returning n.id, n.user_id, n.title, n.body, n.link)
       select c.id, c.title, c.body, c.link,
              coalesce((select json_agg(json_build_object('endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth))
                        from public.push_subscriptions s where s.user_id = c.user_id), '[]'::json) as subs
       from claimed c`,
      [limit],
    ),
  );
  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    jobs.flatMap((j) =>
      j.subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify({ title: j.title, body: j.body ?? "", url: j.link ?? "/dashboard/notifications", tag: j.id }),
            { TTL: 60 * 60 * 24, urgency: "normal" },
          );
          sent += 1;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) dead.push(s.endpoint);
          else logError("push", e);
        }
      }),
    ),
  );
  if (dead.length) await asSystem((tx) => tx.query("delete from public.push_subscriptions where endpoint = any($1)", [dead]));
  return sent;
}
