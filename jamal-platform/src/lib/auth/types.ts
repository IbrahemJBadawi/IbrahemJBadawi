export type SessionIdentity = { id: string; email: string | null };

export type AuthResult =
  | { ok: true; needsEmailConfirmation?: boolean }
  | { ok: false; error: string };

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  role: "customer" | "supplier" | "admin";
};
