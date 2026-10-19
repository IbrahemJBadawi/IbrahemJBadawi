// Fails if a server-only secret could reach the browser:
//  1. a secret variable is referenced from a "use client" file, from a module
//     that isn't marked server-only, or is exposed as NEXT_PUBLIC_*;
//  2. the built client bundle (.next/static) contains a secret's value.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SECRETS = ["RESEND_API_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "CONTACT_TO_EMAIL"];
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

for (const file of walk(path.join(root, "src")).filter((f) => /\.(t|j)sx?$/.test(f))) {
  const text = readFileSync(file, "utf8");
  const rel = path.relative(root, file);
  if (/NEXT_PUBLIC_[A-Z_]*(KEY|TOKEN|SECRET)/.test(text)) problems.push(`${rel}: secret-looking NEXT_PUBLIC_* variable`);
  for (const name of SECRETS) {
    if (!text.includes(name)) continue;
    if (/^\s*["']use client["']/m.test(text)) problems.push(`${rel}: client file references ${name}`);
    if (!text.includes('import "server-only"')) problems.push(`${rel}: ${name} used outside a server-only module`);
  }
}

const staticDir = path.join(root, ".next", "static");
if (existsSync(staticDir)) {
  const values = SECRETS.map((name) => process.env[name]).filter((value) => value && value.length > 6);
  for (const file of walk(staticDir).filter((f) => /\.(js|css|html|json)$/.test(f))) {
    const text = readFileSync(file, "utf8");
    if (text.includes("api.resend.com") || text.includes("api.telegram.org")) problems.push(`${path.relative(root, file)}: delivery code shipped to the browser`);
    for (const value of values) if (text.includes(value)) problems.push(`${path.relative(root, file)}: contains a secret value`);
  }
}

if (problems.length) {
  console.error("Secret check failed:\n" + problems.map((p) => ` - ${p}`).join("\n"));
  process.exit(1);
}
console.log("Secret check passed.");
