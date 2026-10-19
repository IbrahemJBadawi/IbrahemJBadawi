import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { asSystem } from "@/lib/db";
import { storageMode } from "@/lib/db/core";

/**
 * Built-in authentication: bcrypt hashes in auth.users (the same table
 * Supabase uses), and a signed httpOnly session cookie. Works on the local
 * embedded database and on any Postgres, Supabase included.
 */
export const SESSION_COOKIE = "tg_session";
const MAX_AGE = 60 * 60 * 24 * 30; // stay signed in for 30 days
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO6QJ1pL8Vqx7lJm3K5H1yW3o7N9yQZ8a";

export type SessionIdentity = { id: string; email: string };

type G = typeof globalThis & { __growthEphemeralSecret?: string };

/**
 * AUTH_SECRET signs sessions. Without it (e.g. a first Vercel deploy in
 * demo mode) a random per-instance secret is used: secure, but sessions
 * end when the instance restarts — which matches demo data anyway.
 * With a persistent database the secret is mandatory.
 */
export function authSecretStatus(): "ok" | "ephemeral" | "missing" {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return "ok";
  return storageMode() === "postgres" ? "missing" : "ephemeral";
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (authSecretStatus() === "missing") {
    throw new Error("AUTH_SECRET (32+ characters) is required when DATABASE_URL is set.");
  }
  const g = globalThis as G;
  g.__growthEphemeralSecret ??= crypto.randomBytes(32).toString("base64url");
  return new TextEncoder().encode(g.__growthEphemeralSecret);
}

async function setSession(user: SessionIdentity) {
  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSession(): Promise<SessionIdentity | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || authSecretStatus() === "missing") return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { id: payload.sub, email: String(payload.email ?? "") };
  } catch {
    return null;
  }
}

export async function signUp(email: string, password: string, fullName: string) {
  const hash = await bcrypt.hash(password, 12);
  const created = await asSystem(async (tx) => {
    const rows = await tx.query<{ id: string; email: string }>(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
       values ($1, $2, jsonb_build_object('full_name', $3::text), now())
       on conflict (email) do nothing returning id, email`,
      [email, hash, fullName],
    );
    return rows[0] ?? null;
  });
  if (!created) return { ok: false as const, error: "تعذّر إنشاء الحساب بهذا البريد. جرّب تسجيل الدخول أو استعادة كلمة المرور." };
  await setSession(created);
  return { ok: true as const };
}

export async function signIn(email: string, password: string) {
  const user = await asSystem(async (tx) => {
    const rows = await tx.query<{ id: string; email: string; encrypted_password: string | null }>(
      "select id, email, encrypted_password from auth.users where email = $1",
      [email],
    );
    return rows[0] ?? null;
  });
  // Compare against a dummy hash when the user is missing (similar timing).
  const valid = await bcrypt.compare(password, user?.encrypted_password ?? DUMMY_HASH);
  if (!user || !valid) return { ok: false as const, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  await setSession({ id: user.id, email: user.email });
  return { ok: true as const };
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Creates a single-use reset token (1 hour). Returns null for unknown emails. */
export async function createPasswordReset(email: string): Promise<string | null> {
  const token = crypto.randomBytes(32).toString("base64url");
  const ok = await asSystem(async (tx) => {
    const rows = await tx.query<{ user_id: string }>(
      `insert into private.password_resets (token_hash, user_id, expires_at)
       select $2, id, now() + interval '1 hour' from auth.users where email = $1 returning user_id`,
      [email, hashToken(token)],
    );
    return rows.length > 0;
  });
  return ok ? token : null;
}

export async function resetPassword(token: string, password: string) {
  const hash = await bcrypt.hash(password, 12);
  const user = await asSystem(async (tx) => {
    const rows = await tx.query<{ user_id: string; email: string }>(
      `update private.password_resets r set used_at = now()
       from auth.users u
       where r.token_hash = $1 and r.used_at is null and r.expires_at > now() and u.id = r.user_id
       returning r.user_id, u.email`,
      [hashToken(token)],
    );
    if (!rows[0]) return null;
    await tx.query("update auth.users set encrypted_password = $2, updated_at = now() where id = $1", [rows[0].user_id, hash]);
    return { id: rows[0].user_id, email: rows[0].email };
  });
  if (!user) return { ok: false as const, error: "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا." };
  await setSession(user);
  return { ok: true as const };
}

export async function changePassword(userId: string, current: string, next: string) {
  const row = await asSystem(async (tx) =>
    (await tx.query<{ encrypted_password: string | null }>("select encrypted_password from auth.users where id = $1", [userId]))[0],
  );
  if (!row || !(await bcrypt.compare(current, row.encrypted_password ?? DUMMY_HASH))) {
    return { ok: false as const, error: "كلمة المرور الحالية غير صحيحة." };
  }
  const hash = await bcrypt.hash(next, 12);
  await asSystem((tx) => tx.query("update auth.users set encrypted_password = $2, updated_at = now() where id = $1", [userId, hash]));
  return { ok: true as const };
}
