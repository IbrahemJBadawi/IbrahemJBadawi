import "server-only";
import type { ContactInput } from "./validate";

/**
 * Sends a contact request to the company. Two channels, either or both:
 *   - email through Resend's HTTP API: RESEND_API_KEY + CONTACT_TO_EMAIL
 *     (+ CONTACT_FROM_EMAIL, a sender on a domain verified in Resend);
 *   - a Telegram message from a bot: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID.
 * All of these are server-only (no NEXT_PUBLIC_ prefix) and never reach the browser.
 *
 * Messages are sent as plain text (no HTML, no Markdown parse mode), so
 * whatever the visitor typed cannot inject markup into the email or chat.
 */

export type DeliveryResult = "sent" | "not_configured" | "failed";

const LABELS: Record<string, string> = {
  service: "Service request",
  venture: "Venture inquiry",
  partnership: "Partnership",
  education: "Education / training",
  media: "Media",
  other: "Other",
};

export function formatMessage(input: ContactInput, locale: string) {
  return [
    `New contact request — TechMood Technology website`,
    ``,
    `Type: ${LABELS[input.type] ?? input.type}${input.topic ? ` (${input.topic})` : ""}`,
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    input.organization ? `Organisation: ${input.organization}` : null,
    input.budget ? `Budget: ${input.budget}` : null,
    `Language: ${locale}`,
    ``,
    input.message,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function configuredChannels(env: NodeJS.ProcessEnv = process.env) {
  return {
    email: Boolean(env.RESEND_API_KEY && env.CONTACT_TO_EMAIL),
    telegram: Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID),
  };
}

async function sendEmail(input: ContactInput, text: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL || "TechMood Website <onboarding@resend.dev>",
      to: [process.env.CONTACT_TO_EMAIL],
      reply_to: input.email,
      subject: `[TechMood] ${LABELS[input.type] ?? "Contact"} — ${input.name}`.slice(0, 150),
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

async function sendTelegram(text: string) {
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: text.slice(0, 4000), disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

export async function deliver(input: ContactInput, locale: string): Promise<DeliveryResult> {
  const channels = configuredChannels();
  if (!channels.email && !channels.telegram) return "not_configured";
  const text = formatMessage(input, locale);
  const attempts: Promise<boolean>[] = [];
  if (channels.email) attempts.push(sendEmail(input, text).catch(() => false));
  if (channels.telegram) attempts.push(sendTelegram(text).catch(() => false));
  const results = await Promise.all(attempts);
  if (results.some(Boolean)) return "sent";
  // log the fact, never the content or the keys
  console.error("[contact] delivery failed on every configured channel");
  return "failed";
}
