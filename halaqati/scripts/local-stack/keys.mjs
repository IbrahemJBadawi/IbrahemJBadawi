// Prints HS256 anon/service JWTs for the local stack (never use in production).
import crypto from "node:crypto";
const secret = process.env.JWT_SECRET ?? "local-dev-jwt-secret-at-least-32-characters-long";
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const sign = (payload) => {
  const data = `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}`;
  return `${data}.${crypto.createHmac("sha256", secret).update(data).digest("base64url")}`;
};
const exp = Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 3600;
console.log(`ANON_KEY=${sign({ role: "anon", iss: "supabase", exp })}`);
console.log(`SERVICE_KEY=${sign({ role: "service_role", iss: "supabase", exp })}`);
