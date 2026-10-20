import { describe, expect, it } from "vitest";
import { registerSchema, safeNext } from "@/lib/validation/auth";
import { halaqaSchema, recitationSchema } from "@/lib/validation/halaqa";
import { toUserMessage, authErrorMessage } from "@/lib/errors";

describe("auth validation", () => {
  const base = { fullName: "أحمد", email: " A@Example.com ", password: "secret123", roles: ["student"], acceptTerms: "on" };
  it("accepts a valid signup and normalises the email", () => {
    const r = registerSchema.safeParse(base);
    expect(r.success && r.data.email).toBe("a@example.com");
  });
  it("rejects weak passwords, admin roles and missing consent", () => {
    expect(registerSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "onlyletters" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, roles: ["platform_admin"] }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, roles: [] }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, acceptTerms: undefined }).success).toBe(false);
  });
  it("blocks open redirects", () => {
    expect(safeNext("/dashboard/plan")).toBe("/dashboard/plan");
    expect(safeNext("https://evil.example")).toBe("/dashboard");
    expect(safeNext("//evil.example")).toBe("/dashboard");
    expect(safeNext("/\\evil.example")).toBe("/dashboard");
  });
});

describe("halaqa validation", () => {
  const halaqa = {
    name: "حلقة الفجر", audienceGender: "mixed", level: "all", maxStudents: "10", meetingMode: "remote",
    timezone: "Asia/Riyadh", status: "draft", joinPolicy: "approval", schedule: [{ day: 0, start: "05:30", duration: 60 }],
  };
  it("accepts an independent halaqa without a center", () => {
    const r = halaqaSchema.safeParse(halaqa);
    expect(r.success && r.data.centerId).toBeNull();
  });
  it("rejects invite-only (not shipped yet), bad timezones and inverted ages", () => {
    expect(halaqaSchema.safeParse({ ...halaqa, joinPolicy: "invite_only" }).success).toBe(false);
    expect(halaqaSchema.safeParse({ ...halaqa, timezone: "Mars/Base" }).success).toBe(false);
    expect(halaqaSchema.safeParse({ ...halaqa, ageMin: "12", ageMax: "8" }).success).toBe(false);
  });
  it("requires mastery score unless the recitation was not completed", () => {
    const rec = {
      halaqaId: "11111111-1111-4111-8111-111111111111", studentId: "22222222-2222-4222-8222-222222222222",
      activity: "new_memorization", surahFrom: "78", ayahFrom: "1", surahTo: "78", ayahTo: "16",
      completion: "completed", masteryScore: "", recitationScore: "", planAdherence: "no_plan", approve: "approve", errors: [],
    };
    expect(recitationSchema.safeParse(rec).success).toBe(false);
    expect(recitationSchema.safeParse({ ...rec, masteryScore: "4" }).success).toBe(true);
    expect(recitationSchema.safeParse({ ...rec, completion: "not_completed" }).success).toBe(true);
    expect(recitationSchema.safeParse({ ...rec, masteryScore: "4", ayahTo: "41" }).success).toBe(false);
  });
});

describe("error messages", () => {
  it("passes through our Arabic database messages and hides internals", () => {
    expect(toUserMessage({ message: "اكتمل عدد طلاب الحلقة" })).toBe("اكتمل عدد طلاب الحلقة");
    expect(toUserMessage({ code: "42501", message: "permission denied for table x" })).toMatch(/صلاحية/);
    expect(toUserMessage({ message: 'relation "secret_table" does not exist' })).not.toMatch(/secret_table/);
    expect(authErrorMessage({ code: "invalid_credentials", message: "Invalid login credentials" })).toMatch(/غير صحيحة/);
  });
});
