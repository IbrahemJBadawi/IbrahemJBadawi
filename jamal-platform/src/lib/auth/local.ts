import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { asSystem } from "@/lib/db";
import type { AuthResult, SessionIdentity } from "./types";

/**
 * Local authentication adapter (development / self-hosted Postgres).
 * Users live in auth.users (same table name Supabase uses) with bcrypt
 * hashes; the session is a signed, httpOnly JWT cookie.
 */
const COOKIE = "jamal_session";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Run `npm run setup` or set it in .env.local",
    );
  }
  return new TextEncoder().encode(s);
}

async function setSession(user: SessionIdentity) {
  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function localGetSession(): Promise<SessionIdentity | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return { id: payload.sub, email: (payload.email as string) ?? null };
  } catch {
    return null;
  }
}

export async function localSignUp(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult> {
  const hash = await bcrypt.hash(password, 12);
  const created = await asSystem(async (tx) => {
    const rows = await tx.query<{ id: string; email: string }>(
      `insert into auth.users (email, encrypted_password, raw_user_meta_data)
       values ($1, $2, jsonb_build_object('full_name', $3::text))
       on conflict (email) do nothing
       returning id, email`,
      [email, hash, fullName],
    );
    return rows[0] ?? null;
  });
  if (!created) return { ok: false, error: "هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول." };
  await setSession(created);
  return { ok: true };
}

export async function localSignIn(email: string, password: string): Promise<AuthResult> {
  const user = await asSystem(async (tx) => {
    const rows = await tx.query<{ id: string; email: string; encrypted_password: string | null }>(
      "select id, email, encrypted_password from auth.users where email = $1",
      [email],
    );
    return rows[0] ?? null;
  });
  // Compare against a dummy hash when the user is missing to keep timing similar.
  const hash = user?.encrypted_password ?? "$2b$12$C6UzMDM.H6dfI/f/IKcEeO6QJ1pL8Vqx7lJm3K5H1yW3o7N9yQZ8a";
  const valid = await bcrypt.compare(password, hash);
  if (!user || !valid) return { ok: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
  await setSession({ id: user.id, email: user.email });
  return { ok: true };
}

export async function localSignOut() {
  (await cookies()).delete(COOKIE);
}
