import "server-only";
import { asSystem } from "@/lib/db";
import { assistantConfigured } from "./assistant";
import { aiEnabled } from "./store";

/** Shown only when a Gemini key is configured and the admin hasn't switched it off. */
export async function assistantAvailable() {
  return assistantConfigured() && (await asSystem(aiEnabled));
}
