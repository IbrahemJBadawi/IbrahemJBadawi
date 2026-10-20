// Creates .env.local from .env.example with a fresh random AUTH_SECRET.
import fs from "node:fs";
import crypto from "node:crypto";

if (fs.existsSync(".env.local")) {
  console.log(".env.local already exists — leaving it untouched.");
} else {
  const example = fs.readFileSync(".env.example", "utf8");
  const secret = crypto.randomBytes(32).toString("base64url");
  fs.writeFileSync(".env.local", example.replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET=${secret}`));
  console.log("Created .env.local with a random AUTH_SECRET.");
}
