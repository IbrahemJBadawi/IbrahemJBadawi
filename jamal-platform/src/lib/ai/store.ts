import type { Tx } from "@/lib/db/core";

/** Persistence and quota for the assistant. Plain Tx functions so tests can drive them. */

export type AiMessage = { id: string; role: "user" | "assistant"; content: string; created_at: string };

/** Assistant replies in the last 24h, by account or (for guests) by hashed client key. */
export async function usedLast24h(tx: Tx, who: { userId: string | null; clientKey: string }) {
  const [r] = who.userId
    ? await tx.query<{ n: number }>(
        "select count(*)::int as n from public.ai_model_calls where user_id = $1 and called_at > now() - interval '24 hours'",
        [who.userId],
      )
    : await tx.query<{ n: number }>(
        "select count(*)::int as n from public.ai_model_calls where user_id is null and client_key = $1 and called_at > now() - interval '24 hours'",
        [who.clientKey],
      );
  return r.n;
}

export async function recordCall(
  tx: Tx,
  c: { userId: string | null; clientKey: string; model: string; inputTokens: number; outputTokens: number },
) {
  await tx.query(
    "insert into public.ai_model_calls (user_id, client_key, model, input_tokens, output_tokens) values ($1, $2, $3, $4, $5)",
    [c.userId, c.clientKey, c.model, c.inputTokens, c.outputTokens],
  );
}

export async function aiEnabled(tx: Tx) {
  const [s] = await tx.query<{ ai_assistant_enabled: boolean }>("select ai_assistant_enabled from public.store_settings where id = 1");
  return Boolean(s?.ai_assistant_enabled);
}

/** Runs under the user's RLS context: only their own threads are visible. */
export async function latestThread(tx: Tx) {
  const [t] = await tx.query<{ id: string }>("select id from public.ai_threads order by last_message_at desc limit 1");
  return t?.id ?? null;
}

export async function threadMessages(tx: Tx, threadId: string, limit = 40) {
  const rows = await tx.query<AiMessage>(
    `select id, role, content, created_at::text from (
       select * from public.ai_messages where thread_id = $1 order by created_at desc limit $2
     ) m order by created_at`,
    [threadId, limit],
  );
  return rows;
}

export async function createThread(tx: Tx, userId: string, title: string) {
  const [t] = await tx.query<{ id: string }>(
    "insert into public.ai_threads (user_id, title_ar) values ($1, $2) returning id",
    [userId, title.slice(0, 60) || "محادثة جديدة"],
  );
  return t.id;
}

export async function ownsThread(tx: Tx, threadId: string) {
  const rows = await tx.query<{ id: string }>("select id from public.ai_threads where id = $1", [threadId]);
  return rows.length > 0;
}

export async function appendExchange(tx: Tx, threadId: string, question: string, reply: string, model: string) {
  await tx.query(
    `insert into public.ai_messages (thread_id, role, content, model, created_at)
     values ($1, 'user', $2, null, now()), ($1, 'assistant', $3, $4, now() + interval '1 millisecond')`,
    [threadId, question, reply, model],
  );
  await tx.query("update public.ai_threads set last_message_at = now() where id = $1", [threadId]);
}
