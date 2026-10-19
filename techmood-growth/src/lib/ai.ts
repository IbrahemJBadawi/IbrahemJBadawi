import "server-only";
import { env, integrations } from "@/lib/env";
import { logError } from "@/lib/errors";

/**
 * Gemini, called from the server only (the key never reaches the browser).
 * Inputs are minimised and redacted before leaving our servers: no names,
 * emails or phone numbers are sent. Results are drafts for a person to
 * review; nothing is ever sent to a customer automatically.
 */
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const PHONE = /\+?\d[\d\s()-]{6,}\d/g;
const URL_RE = /https?:\/\/\S+/g;

export function redact(text: string | null | undefined, max = 1500): string {
  return (text ?? "").replace(EMAIL, "[بريد]").replace(PHONE, "[هاتف]").replace(URL_RE, "[رابط]").slice(0, max);
}

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

export async function generate(system: string, prompt: string): Promise<AiResult> {
  if (!integrations.ai) return { ok: false, error: "المساعد الذكي غير مهيّأ بعد: أضف GEMINI_API_KEY في إعدادات الخادم." };
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 900 },
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      logError("ai", { code: String(res.status), message: (await res.text().catch(() => "")).slice(0, 200) });
      return { ok: false, error: res.status === 429 ? "مزود الذكاء الاصطناعي مشغول الآن. حاول بعد قليل." : "تعذّر الحصول على اقتراح الآن." };
    }
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return text ? { ok: true, text } : { ok: false, error: "لم يُرجع المساعد نصًا. أعد المحاولة." };
  } catch (e) {
    logError("ai", e);
    return { ok: false, error: "تعذّر الاتصال بالمساعد الذكي." };
  }
}

export const AI_SYSTEM =
  "أنت مساعد مبيعات لشركة خدمية أو مركز تدريب في الخليج العربي. اكتب بالعربية الفصحى المبسطة وبنبرة مهذبة ومهنية وموجزة. " +
  "لا تخترع أسعارًا أو وعودًا أو معلومات غير موجودة في المعطيات. استخدم [الاسم] مكان اسم العميل. لا تضف مقدمات أو شروحات عن نفسك.";
