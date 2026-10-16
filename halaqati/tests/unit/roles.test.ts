import { describe, expect, it } from "vitest";
import { SELF_SERVICE_ROLES, availableContexts, resolveActiveContext } from "@/lib/roles";

describe("role contexts", () => {
  it("combines global roles and institutional admin memberships", () => {
    const ctx = availableContexts({
      roles: ["student", "quran_teacher"],
      centers: [{ id: "c", name: "مركز", role: "admin", status: "verified" }],
      organizations: [{ id: "o", name: "دار", role: "staff", status: "verified" }],
    });
    expect(ctx).toEqual(["quran_teacher", "student", "center_admin"]);
  });

  it("never resolves to a context the user does not hold", () => {
    const available = availableContexts({ roles: ["student"], centers: [], organizations: [] });
    expect(resolveActiveContext("platform_admin", available)).toBe("student");
    expect(resolveActiveContext("center_admin", available)).toBe("student");
    expect(resolveActiveContext(undefined, [])).toBeNull();
  });

  it("does not offer admin roles for self-service", () => {
    expect(SELF_SERVICE_ROLES).not.toContain("platform_admin");
  });
});
