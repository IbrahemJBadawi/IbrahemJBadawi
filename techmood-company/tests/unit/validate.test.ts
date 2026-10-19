import { describe, expect, it } from "vitest";
import { LIMITS, hasErrors, normalize, validate } from "@/lib/contact/validate";

const good = { name: "Ibrahem", email: "Someone@Example.com", organization: "", type: "service", budget: "", topic: "", message: "We need an internal dashboard for our team.", consent: "on" };

describe("contact validation", () => {
  it("accepts a complete request and normalises the email", () => {
    const input = normalize(good);
    expect(input.email).toBe("someone@example.com");
    expect(input.consent).toBe(true);
    expect(hasErrors(validate(input))).toBe(false);
  });

  it("requires name, email, type, message and consent", () => {
    const errors = validate(normalize({}));
    expect(errors).toMatchObject({ name: "required", email: "required", type: "required", message: "required", consent: "required" });
  });

  it("rejects malformed emails, unknown types and budgets", () => {
    const errors = validate(normalize({ ...good, email: "a@b", type: "hack", budget: "1m" }));
    expect(errors).toMatchObject({ email: "invalid", type: "invalid", budget: "invalid" });
  });

  it("enforces message length limits", () => {
    expect(validate(normalize({ ...good, message: "short" })).message).toBe("too_short");
    expect(validate(normalize({ ...good, message: "x".repeat(LIMITS.message + 50) })).message).toBe("too_long");
  });

  it("strips control characters and treats a missing checkbox as no consent", () => {
    const input = normalize({ ...good, name: "Ib\u0000rahem\u0007", consent: undefined });
    expect(input.name).toBe("Ibrahem");
    expect(validate(input).consent).toBe("required");
  });
});
