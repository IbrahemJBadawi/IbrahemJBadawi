import { afterEach, describe, expect, it, vi } from "vitest";
import { configuredChannels, deliver, formatMessage } from "@/lib/contact/deliver";
import { allowSubmission, resetRateLimit } from "@/lib/contact/rate-limit";
import { normalize } from "@/lib/contact/validate";

const input = normalize({ name: "Sara", email: "sara@example.com", type: "partnership", message: "<b>Hello</b> we would like to partner with you.", consent: "on" });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("delivery", () => {
  it("reports not_configured when no channel is set — never a fake success", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await deliver(input, "ar")).toBe("not_configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("detects configured channels only when both values are set", () => {
    expect(configuredChannels({ RESEND_API_KEY: "k" } as unknown as NodeJS.ProcessEnv)).toEqual({ email: false, telegram: false });
    expect(configuredChannels({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1" } as unknown as NodeJS.ProcessEnv)).toEqual({ email: false, telegram: true });
  });

  it("returns sent when a channel accepts, failed when every channel fails", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "token");
    vi.stubEnv("TELEGRAM_CHAT_ID", "42");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("{}", { status: 200 }));
    expect(await deliver(input, "en")).toBe("sent");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("no", { status: 500 }));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await deliver(input, "en")).toBe("failed");
  });

  it("formats plain text containing the visitor's details", () => {
    const text = formatMessage(input, "ar");
    expect(text).toContain("Type: Partnership");
    expect(text).toContain("sara@example.com");
    expect(text).toContain("<b>Hello</b>"); // kept as text; never sent as HTML
  });
});

describe("rate limit", () => {
  it("allows five submissions per client per window", () => {
    resetRateLimit();
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) expect(allowSubmission("1.2.3.4", now + i)).toBe(true);
    expect(allowSubmission("1.2.3.4", now + 10)).toBe(false);
    expect(allowSubmission("5.6.7.8", now + 10)).toBe(true);
    expect(allowSubmission("1.2.3.4", now + 11 * 60 * 1000)).toBe(true);
  });
});
