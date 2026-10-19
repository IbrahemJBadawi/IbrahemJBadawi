"use server";

import { createHash } from "node:crypto";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { asSystem, asUser } from "@/lib/db";
import { runAssistant, type ChatTurn } from "@/lib/ai/assistant";
import { assistantAvailable } from "@/lib/ai/availability";
import { appendExchange, createThread, ownsThread, recordCall, threadMessages, usedLast24h } from "@/lib/ai/store";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type AssistantReply = { ok: true; reply: string; threadId: string | null } | { ok: false; error: string };

const input = z.object({
  text: z.string().trim().min(1, "اكتب سؤالك").max(1000, "السؤال طويل جدًا"),
  threadId: z.uuid().nullable(),
  // Guests keep their own short history in the browser; it is only replayed to the model.
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(12),
});

const limitFor = (user: boolean) =>
  Math.max(0, Number(user ? process.env.AI_DAILY_LIMIT_USER ?? 30 : process.env.AI_DAILY_LIMIT_GUEST ?? 10) || 0);

export async function askAssistantAction(raw: unknown): Promise<AssistantReply> {
  const p = input.safeParse(raw);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "طلب غير صالح" };
  if (!(await assistantAvailable())) return { ok: false, error: "المساعد الذكي غير مفعّل حاليًا." };
  if (!(await rateLimit("ai", 8, 60_000))) return { ok: false, error: "رسائل كثيرة خلال دقيقة. انتظر قليلًا." };

  const user = await getCurrentUser();
  // Hashed so raw IP addresses are never stored.
  const clientKey = createHash("sha256").update(`ai:${await clientIp()}`).digest("hex").slice(0, 32);
  const used = await asSystem((tx) => usedLast24h(tx, { userId: user?.id ?? null, clientKey }));
  if (used >= limitFor(!!user)) {
    return { ok: false, error: user ? "وصلت إلى الحد اليومي للمساعد. عُد غدًا أو تواصل مع الدعم." : "وصلت إلى الحد اليومي للزوار. سجّل الدخول لرسائل أكثر أو تواصل مع الدعم." };
  }

  let history: ChatTurn[];
  let threadId = p.data.threadId;
  if (user) {
    if (threadId && !(await asUser(user, (tx) => ownsThread(tx, threadId!)))) threadId = null;
    history = threadId ? (await asUser(user, (tx) => threadMessages(tx, threadId!, 20))).map(({ role, content }) => ({ role, content })) : [];
  } else {
    history = p.data.history.slice(-10);
  }
  // The conversation must start with a user turn.
  while (history[0]?.role === "assistant") history.shift();

  const result = await runAssistant([...history, { role: "user", content: p.data.text }]);
  await asSystem((tx) =>
    recordCall(tx, { userId: user?.id ?? null, clientKey, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens }),
  );
  if (!result.ok) return { ok: false, error: result.error };

  if (user) {
    threadId = await asUser(user, async (tx) => {
      const id = threadId ?? (await createThread(tx, user.id, p.data.text));
      await appendExchange(tx, id, p.data.text, result.reply, result.model);
      return id;
    });
  }
  return { ok: true, reply: result.reply, threadId };
}
