"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { asSystem } from "@/lib/db";
import { resolveOrderAccess } from "@/lib/data/orders";
import { removeSubscription, saveSubscription } from "@/lib/push/server";
import { rateLimit } from "@/lib/rate-limit";

const sub = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(8).max(100) }),
});
const input = z.object({
  subscription: sub,
  // Guests follow one order with its private link token.
  order: z.object({ number: z.string().max(40), token: z.string().max(100) }).optional(),
});

export async function subscribePushAction(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  if (!(await rateLimit("push", 20, 60 * 60_000))) return { ok: false, error: "محاولات كثيرة. حاول لاحقًا." };
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: "تعذّر تفعيل الإشعارات على هذا الجهاز." };
  const user = await getCurrentUser();
  let orderId: string | null = null;
  if (p.data.order) {
    orderId = await resolveOrderAccess({ number: p.data.order.number, token: p.data.order.token });
    if (!orderId) return { ok: false, error: "لا يمكن ربط الإشعارات بهذا الطلب." };
  }
  if (!user && !orderId) return { ok: false, error: "سجّل الدخول لتفعيل الإشعارات." };
  const ua = (await headers()).get("user-agent");
  await asSystem((tx) => saveSubscription(tx, p.data.subscription, { userId: user?.id ?? null, orderId }, ua));
  return { ok: true };
}

export async function unsubscribePushAction(endpoint: string) {
  const e = z.url().max(1000).safeParse(endpoint);
  if (!e.success) return { ok: false };
  await asSystem((tx) => removeSubscription(tx, e.data));
  return { ok: true };
}
