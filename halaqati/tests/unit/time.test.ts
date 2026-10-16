import { describe, expect, it } from "vitest";
import { localToUtcIso, utcToLocalInput } from "@/lib/time";

describe("timezone conversion", () => {
  it("converts fixed-offset zones", () => {
    expect(localToUtcIso("2026-10-20T17:00", "Asia/Riyadh")).toBe("2026-10-20T14:00:00.000Z");
  });
  it("handles daylight saving time", () => {
    expect(localToUtcIso("2026-07-01T10:00", "Europe/Berlin")).toBe("2026-07-01T08:00:00.000Z");
    expect(localToUtcIso("2026-12-01T10:00", "Europe/Berlin")).toBe("2026-12-01T09:00:00.000Z");
  });
  it("round-trips for datetime-local inputs", () => {
    expect(utcToLocalInput("2026-10-20T14:00:00.000Z", "Asia/Riyadh")).toBe("2026-10-20T17:00");
    expect(localToUtcIso("bad", "UTC")).toBeNull();
  });
});
