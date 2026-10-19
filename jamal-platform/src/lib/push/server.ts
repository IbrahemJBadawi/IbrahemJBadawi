/**
 * Web push (free, standard browser push — no third-party provider).
 * Framework-free so tests and scripts can use it; Next.js code reaches it
 * through the actions and the drain hook in src/lib/db.
 */
import webpush from "web-push";
import { withContext, type Tx } from "@/lib/db/core";

type Keys = { publicKey: string; privateKey: string };
let cached: Keys | null = null;

/** VAPID keys: from the environment if set, otherwise generated once and kept in the database. */
export async function vapidKeys(tx?: Tx): Promise<Keys> {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  if (cached) return cached;
  const load = async (t: Tx) => {
    const rows = await t.query<{ value: string }>("select value from app_meta.secrets where key = 'vapid'");
    if (rows[0]) return JSON.parse(rows[0].value) as Keys;
    const fresh = webpush.generateVAPIDKeys();
    await t.query("insert into app_meta.secrets (key, value) values ('vapid', $1) on conflict (key) do nothing", [JSON.stringify(fresh)]);
    const [again] = await t.query<{ value: string }>("select value from app_meta.secrets where key = 'vapid'");
    return JSON.parse(again.value) as Keys;
  };
  cached = tx ? await load(tx) : await withContext({ role: "system" }, load);
  return cached;
}

export type SubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(
  tx: Tx,
  sub: SubscriptionInput,
  owner: { userId: string | null; orderId: string | null },
  userAgent: string | null,
) {
  await tx.query(
    `insert into public.push_subscriptions (user_id, order_id, endpoint, p256dh, auth_key, user_agent)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (endpoint) do update set
       user_id = coalesce(excluded.user_id, public.push_subscriptions.user_id),
       order_id = coalesce(excluded.order_id, public.push_subscriptions.order_id),
       p256dh = excluded.p256dh, auth_key = excluded.auth_key, failures = 0`,
    [owner.userId, owner.orderId, sub.endpoint, sub.keys.p256dh, sub.keys.auth, userAgent?.slice(0, 200) ?? null],
  );
}

export async function removeSubscription(tx: Tx, endpoint: string) {
  await tx.query("delete from public.push_subscriptions where endpoint = $1", [endpoint]);
}

/** Sends queued pushes. Safe to call concurrently (rows are claimed with SKIP LOCKED). */
export async function drainPushOutbox(limit = 40) {
  const keys = await vapidKeys();
  const subject = `mailto:${process.env.PUSH_CONTACT_EMAIL || "support@aljamal.store"}`;
  return withContext({ role: "system" }, async (tx) => {
    const rows = await tx.query<{ id: number; title: string; body: string | null; link: string | null; sub_id: string; endpoint: string; p256dh: string; auth_key: string }>(
      `select o.id, o.title, o.body, o.link, s.id as sub_id, s.endpoint, s.p256dh, s.auth_key
       from public.push_outbox o join public.push_subscriptions s on s.id = o.subscription_id
       where o.status = 'queued' and o.attempts < 3
       order by o.queued_at limit $1 for update of o skip locked`,
      [limit],
    );
    let sent = 0;
    for (const r of rows) {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth_key } },
          JSON.stringify({ title: r.title, body: r.body ?? "", link: r.link ?? "/" }),
          { vapidDetails: { subject, ...keys }, TTL: 60 * 60 * 24, timeout: 8000 },
        );
        await tx.query("update public.push_outbox set status = 'sent', sent_at = now(), attempts = attempts + 1 where id = $1", [r.id]);
        await tx.query("update public.push_subscriptions set last_success_at = now(), failures = 0 where id = $1", [r.sub_id]);
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          // The browser dropped this subscription: forget it (its queue goes with it).
          await tx.query("delete from public.push_subscriptions where id = $1", [r.sub_id]);
        } else {
          await tx.query("update public.push_outbox set attempts = attempts + 1, status = case when attempts + 1 >= 3 then 'failed' else 'queued' end where id = $1", [r.id]);
          await tx.query("update public.push_subscriptions set failures = failures + 1 where id = $1", [r.sub_id]);
        }
      }
    }
    return { sent, picked: rows.length };
  });
}

/** Cheap check so the drain only runs when something is waiting. */
export async function hasQueuedPush() {
  const rows = await withContext({ role: "system" }, (tx) =>
    tx.query("select 1 from public.push_outbox where status = 'queued' and attempts < 3 limit 1"),
  );
  return rows.length > 0;
}
