import { connection } from "next/server";
import { vapidKeys } from "@/lib/push/server";

/** Public VAPID key the browser needs to subscribe (public by design). */
export async function GET() {
  await connection();
  const { publicKey } = await vapidKeys();
  return Response.json({ publicKey }, { headers: { "Cache-Control": "public, max-age=3600" } });
}
