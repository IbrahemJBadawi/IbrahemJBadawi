import { drainPushOutbox } from "@/lib/push/server";

/**
 * Backup sender for queued push notifications (normally sent right after the
 * action that created them). Call with `Authorization: Bearer $CRON_SECRET`.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  return Response.json(await drainPushOutbox(100));
}

// Vercel Cron calls with GET and the same Bearer header.
export const GET = POST;
