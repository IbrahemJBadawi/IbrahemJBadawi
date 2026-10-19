/**
 * The contact form's rules — shared by the browser (instant feedback) and the
 * server (the check that counts). Plain functions, no dependencies, so the
 * client bundle stays small.
 */

export const REQUEST_TYPES = ["service", "venture", "partnership", "education", "media", "other"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const BUDGETS = ["", "under-1k", "1k-5k", "5k-15k", "15k-plus", "not-sure"] as const;
export type Budget = (typeof BUDGETS)[number];

export const LIMITS = { name: 100, email: 200, organization: 150, message: 4000, messageMin: 20, topic: 80 } as const;

export type ContactInput = {
  name: string;
  email: string;
  organization: string;
  type: string;
  budget: string;
  topic: string;
  message: string;
  consent: boolean;
};

export type ContactField = "name" | "email" | "organization" | "type" | "budget" | "topic" | "message" | "consent";
export type FieldError = "required" | "too_long" | "too_short" | "invalid";
export type ContactErrors = Partial<Record<ContactField, FieldError>>;

// Pragmatic: one @, a dot in the domain, no spaces or angle brackets.
const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;
// Control characters other than tab/newline are never legitimate in a message.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function clean(value: unknown, max: number) {
  return String(value ?? "")
    .replace(CONTROL, "")
    .trim()
    .slice(0, max + 1);
}

export function normalize(raw: Record<string, unknown>): ContactInput {
  return {
    name: clean(raw.name, LIMITS.name),
    email: clean(raw.email, LIMITS.email).toLowerCase(),
    organization: clean(raw.organization, LIMITS.organization),
    type: clean(raw.type, 20),
    budget: clean(raw.budget, 20),
    topic: clean(raw.topic, LIMITS.topic),
    message: clean(raw.message, LIMITS.message),
    consent: raw.consent === true || raw.consent === "on" || raw.consent === "true",
  };
}

export function validate(input: ContactInput): ContactErrors {
  const errors: ContactErrors = {};
  if (!input.name || input.name.length < 2) errors.name = input.name ? "too_short" : "required";
  else if (input.name.length > LIMITS.name) errors.name = "too_long";

  if (!input.email) errors.email = "required";
  else if (input.email.length > LIMITS.email) errors.email = "too_long";
  else if (!EMAIL.test(input.email)) errors.email = "invalid";

  if (input.organization.length > LIMITS.organization) errors.organization = "too_long";
  if (!(REQUEST_TYPES as readonly string[]).includes(input.type)) errors.type = input.type ? "invalid" : "required";
  if (!(BUDGETS as readonly string[]).includes(input.budget)) errors.budget = "invalid";
  if (input.topic.length > LIMITS.topic) errors.topic = "too_long";

  if (!input.message) errors.message = "required";
  else if (input.message.length < LIMITS.messageMin) errors.message = "too_short";
  else if (input.message.length > LIMITS.message) errors.message = "too_long";

  if (!input.consent) errors.consent = "required";
  return errors;
}

export function hasErrors(errors: ContactErrors) {
  return Object.keys(errors).length > 0;
}
