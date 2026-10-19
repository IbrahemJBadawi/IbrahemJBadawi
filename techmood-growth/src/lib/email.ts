import "server-only";
import { env, integrations } from "@/lib/env";
import { logError } from "@/lib/errors";

export type EmailResult = { status: "sent" | "failed" | "not_configured"; error?: string };

/**
 * Sends one email through Resend's HTTP API. Never pretends: without a key
 * the result is "not_configured", and callers record that outcome.
 */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<EmailResult> {
  if (!integrations.email) return { status: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom, to: [to], subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logError("email", { code: String(res.status), message: body });
      return { status: "failed", error: `HTTP ${res.status}` };
    }
    return { status: "sent" };
  } catch (e) {
    logError("email", e);
    return { status: "failed", error: "network" };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Simple, RTL, mobile-friendly email layout. */
export function emailLayout(title: string, lines: string[], cta?: { label: string; url: string }) {
  const html = `<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;background:#f3f6fc;font-family:Tahoma,Arial,sans-serif;color:#0f1b3d">
  <div style="max-width:520px;margin:0 auto;padding:24px">
  <div style="background:#fff;border-radius:20px;padding:24px;border:1px solid #e5eaf5">
  <p style="margin:0 0 4px;font-weight:bold;color:#1d4ed8">TechMood Growth</p>
  <h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
  ${lines.map((l) => `<p style="margin:0 0 10px;line-height:1.8">${esc(l)}</p>`).join("")}
  ${cta ? `<p style="margin:20px 0 0"><a href="${esc(cta.url)}" style="display:inline-block;background:#1f50e0;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">${esc(cta.label)}</a></p>` : ""}
  </div></div></body></html>`;
  const text = [title, "", ...lines, ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  return { html, text };
}
