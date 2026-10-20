import { asSystem } from "@/lib/db";

/**
 * Drains the e-mail outbox (called by a scheduler, e.g. Vercel Cron, with
 * `Authorization: Bearer $CRON_SECRET`). Sends through Resend only when
 * RESEND_API_KEY and EMAIL_FROM are configured; otherwise nothing is sent
 * and the queue is left intact — no fake "sent" states.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return Response.json({ sent: 0, reason: "no e-mail provider configured" }, { status: 503 });

  const site = process.env.NEXT_PUBLIC_SITE_URL || "";
  const batch = await asSystem((tx) =>
    tx.query<{ id: string; to_email: string; subject: string; body_ar: string; action_url: string | null }>(
      `update public.email_outbox set status = 'sending', claimed_at = now(), attempts = attempts + 1
       where id in (select id from public.email_outbox where status = 'queued' or (status = 'sending' and claimed_at < now() - interval '10 minutes')
                    order by queued_at limit 20 for update skip locked)
       returning id, to_email, subject, body_ar, action_url`,
    ),
  );
  let sent = 0;
  for (const m of batch) {
    const link = m.action_url ? `${site}${m.action_url}` : site;
    const html = `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8"><p>${escapeHtml(m.body_ar)}</p>${link ? `<p><a href="${escapeHtml(link)}">فتح في متجر الجمال</a></p>` : ""}</div>`;
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: m.to_email, subject: m.subject, html }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await asSystem((tx) => tx.query("update public.email_outbox set status = 'sent', sent_at = now(), last_error = null where id = $1", [m.id]));
      sent++;
    } catch (e) {
      await asSystem((tx) =>
        tx.query(
          "update public.email_outbox set status = case when attempts >= 5 then 'failed' else 'queued' end, last_error = $2 where id = $1",
          [m.id, String(e instanceof Error ? e.message : e).slice(0, 300)],
        ),
      );
    }
  }
  return Response.json({ sent, claimed: batch.length });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

// Vercel Cron calls with GET and the same Bearer header.
export const GET = POST;
