// Fails if secrets could reach the browser:
//  1. the service-role key is referenced from client code or as NEXT_PUBLIC_*;
//  2. the built client bundle (.next/static) contains server-only values
//     (service key / JWT secret from the environment, or "service_role" JWTs).
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

// 1. Source checks.
for (const file of walk(path.join(root, "src")).filter((f) => /\.(t|j)sx?$/.test(f))) {
  const text = readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (/NEXT_PUBLIC_[A-Z_]*(SERVICE|SECRET)/.test(text)) problems.push(`${rel}: secret exposed via NEXT_PUBLIC_*`);
  if (text.includes("SUPABASE_SERVICE_ROLE_KEY")) {
    if (/^\s*["']use client["']/m.test(text)) problems.push(`${rel}: client component references the service key`);
    if (!text.includes('import "server-only"')) problems.push(`${rel}: service key used outside a server-only module`);
  }
}

// 2. Bundle checks (only if a build exists).
const staticDir = path.join(root, ".next", "static");
if (existsSync(staticDir)) {
  const secrets = [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.JWT_SECRET].filter((s) => s && s.length > 10);
  // base64url of '"role":"service_role"' fragments that appear in service JWTs
  const serviceJwt = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*InNlcnZpY2Vfcm9sZS[A-Za-z0-9_-]*\./;
  for (const file of walk(staticDir).filter((f) => /\.(js|css|html|json)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    for (const s of secrets) if (text.includes(s)) problems.push(`${rel}: contains a server-only secret value`);
    if (serviceJwt.test(text)) problems.push(`${rel}: contains a service_role JWT`);
  }
} else {
  console.log("note: no .next build found; bundle scan skipped");
}

if (problems.length) {
  console.error("Secret exposure check FAILED:\n" + problems.map((p) => ` - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Secret exposure check passed.");
