import { describe, expect, it } from "vitest";
import { challengeDays, challengeScore, parseInvite, parseReport } from "@/lib/challenges";

const invite = { id: "abc12345-def", kind: "reading", days: 7, startDate: "2026-11-17", hostName: "إبراهيم" };

describe("تحديات خليلي: رابط الدعوة وتحديث التقدم", () => {
  it("يقرأ دعوة صالحة دون أي بيانات شخصية إضافية", () => {
    expect(parseInvite(JSON.stringify(invite))).toEqual(invite);
  });

  it("يرفض دعوة أو تقريرًا غير صالح أو متلاعبًا بالصيغة", () => {
    expect(parseInvite("{invalid")).toBeNull();
    expect(parseInvite(JSON.stringify({ ...invite, days: 999 }))).toBeNull();
    expect(parseInvite(JSON.stringify({ ...invite, kind: "repentance" }))).toBeNull();
    expect(parseReport(JSON.stringify({ id: invite.id, sender: "خليل", completedDays: ["bad-date"] }))).toBeNull();
    expect(parseReport("x".repeat(1700))).toBeNull();
  });

  it("يحسب نقاط الأيام المكتملة فقط داخل مدة التحدي", () => {
    const days = challengeDays({ startDate: "2026-11-29", days: 4 });
    expect(days).toEqual(["2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(challengeScore({ "2026-11-29": true, "2026-11-30": false, "2026-12-01": true, "2026-12-03": true }, days)).toBe(2);
  });

  it("ينظّف تواريخ التقدم المكررة", () => {
    expect(parseReport(JSON.stringify({ id: invite.id, sender: "خليل", completedDays: ["2026-11-17", "2026-11-17"] }))).toEqual({
      id: invite.id,
      sender: "خليل",
      completedDays: ["2026-11-17"],
    });
  });
});
