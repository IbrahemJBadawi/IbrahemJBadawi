import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createPublicClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Claim = {
  title: string;
  body: string | null;
  url: string;
  vapid_public: string | null;
  vapid_private: string | null;
  vapid_subject: string;
  subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }>;
};

/**
 * Called by the database (pg_net) right after a notification is created.
 * The body carries only a one-time token; the payload and the VAPID keys
 * are claimed from the database with it, so this endpoint holds no secret
 * and a forged call gets nothing.
 */
export async function POST(request: NextRequest) {
  let token: unknown;
  try {
    token = (await request.json())?.token;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (typeof token !== "string" || !/^[0-9a-f]{64}$/.test(token)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("claim_push", { p_token: token });
  const claim = data as Claim | null;
  if (error || !claim || !claim.vapid_public || !claim.vapid_private) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  webpush.setVapidDetails(claim.vapid_subject, claim.vapid_public, claim.vapid_private);
  const payload = JSON.stringify({ title: claim.title, body: claim.body ?? "", url: claim.url });
  let sent = 0;
  await Promise.all(
    claim.subscriptions.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 60 * 24,
          urgency: "normal",
        });
        sent += 1;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.rpc("prune_push_subscription", { p_token: token, p_endpoint: s.endpoint });
        }
      }
    }),
  );
  return NextResponse.json({ ok: true, sent });
}
