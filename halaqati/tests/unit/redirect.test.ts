import { describe, expect, it } from "vitest";
import { localRedirect } from "@/lib/redirect";

describe("localRedirect", () => {
  it("keeps same-origin paths relative", () => {
    const r = localRedirect("/dashboard?x=1", 303);
    expect(r.status).toBe(303);
    expect(r.headers.get("location")).toBe("/dashboard?x=1");
  });
  it("refuses other origins", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "dashboard"]) {
      expect(localRedirect(bad).headers.get("location")).toBe("/");
    }
  });
});
