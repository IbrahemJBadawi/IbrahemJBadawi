"use server";

import { headers } from "next/headers";
import { deliver } from "@/lib/contact/deliver";
import { allowSubmission } from "@/lib/contact/rate-limit";
import { hasErrors, normalize, validate, type ContactErrors } from "@/lib/contact/validate";

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: ContactErrors }
  | { status: "sent" }
  | { status: "not_configured" }
  | { status: "failed" }
  | { status: "rate_limited" }
  | { status: "spam" };

const MIN_FILL_MS = 3000;

/**
 * Receives the contact form. Validates again on the server (the browser's
 * check is a convenience), drops obvious bots (honeypot field, a form sent
 * faster than a person can type), limits submissions per client, and only
 * reports "sent" when a configured channel actually accepted the message.
 */
export async function submitContact(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const locale = formData.get("locale") === "en" ? "en" : "ar";

  // Honeypot: real people never see or fill this field.
  if (String(formData.get("website") ?? "").trim() !== "") return { status: "spam" };
  const startedAt = Number(formData.get("started_at") ?? 0);
  if (!startedAt || Date.now() - startedAt < MIN_FILL_MS) return { status: "spam" };

  const input = normalize(Object.fromEntries(formData.entries()));
  const errors = validate(input);
  if (hasErrors(errors)) return { status: "invalid", errors };

  const list = await headers();
  const client = (list.get("x-forwarded-for") ?? "").split(",")[0].trim() || list.get("x-real-ip") || "unknown";
  if (!allowSubmission(client)) return { status: "rate_limited" };

  const result = await deliver(input, locale);
  return { status: result };
}
