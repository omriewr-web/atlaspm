/**
 * Regression tests for centralized authorization scoping (data-scope.ts).
 *
 * Covers fixes:
 *   A. Buildings API scope (getBuildingIdScope)
 *   B. Work order building access (canAccessBuilding / assertBuildingAccess)
 *   7. Standardized route-level authorization via centralized helpers
 */
import { describe, it, expect } from "vitest";
import {
  getBuildingScope,
  getBuildingIdScope,
  getTenantScope,
  canAccessBuilding,
  EMPTY_SCOPE,
} from "@/lib/data-scope";

// ── Test users ──

const admin = { role: "ADMIN", assignedProperties: [] };
const scopedUser = { role: "PM", assignedProperties: ["bld-1", "bld-2"] };
const emptyUser = { role: "PM", assignedProperties: [] };
const nullUser = { role: "COLLECTOR", assignedProperties: null };
const undefinedUser = { role: "COLLECTOR" } as any;

// ─────────────────────────────────────────────────────────────────────────────
// A. Buildings API — getBuildingIdScope
// ─────────────────────────────────────────────────────────────────────────────

describe("getBuildingIdScope", () => {
  it("admin sees all buildings (empty where clause)", () => {
    const scope = getBuildingIdScope(admin);
    expect(scope).toEqual({});
  });

  it("scoped user sees only assigned buildings", () => {
    const scope = getBuildingIdScope(scopedUser);
    expect(scope).toEqual({ id: { in: ["bld-1", "bld-2"] } });
  });

  it("non-admin with empty assignedProperties gets EMPTY_SCOPE", () => {
    expect(getBuildingIdScope(emptyUser)).toBe(EMPTY_SCOPE);
  });

  it("non-admin with null assignedProperties gets EMPTY_SCOPE", () => {
    expect(getBuildingIdScope(nullUser)).toBe(EMPTY_SCOPE);
  });

  it("non-admin with undefined assignedProperties gets EMPTY_SCOPE", () => {
    expect(getBuildingIdScope(undefinedUser)).toBe(EMPTY_SCOPE);
  });

  it("admin with explicit buildingId gets scoped to that building", () => {
    const scope = getBuildingIdScope(admin, "bld-99");
    expect(scope).toEqual({ id: "bld-99" });
  });

  it("scoped user with assigned explicit buildingId gets access", () => {
    const scope = getBuildingIdScope(scopedUser, "bld-1");
    expect(scope).toEqual({ id: "bld-1" });
  });

  it("scoped user with unassigned explicit buildingId gets EMPTY_SCOPE", () => {
    expect(getBuildingIdScope(scopedUser, "bld-99")).toBe(EMPTY_SCOPE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B. Work order / generic building access — canAccessBuilding
// ─────────────────────────────────────────────────────────────────────────────

describe("canAccessBuilding", () => {
  it("admin can access any building", () => {
    expect(canAccessBuilding(admin, "any-building")).toBe(true);
  });

  it("scoped user can access assigned building", () => {
    expect(canAccessBuilding(scopedUser, "bld-1")).toBe(true);
  });

  it("scoped user cannot access unassigned building", () => {
    expect(canAccessBuilding(scopedUser, "bld-99")).toBe(false);
  });

  it("user with no assignments cannot access any building", () => {
    expect(canAccessBuilding(emptyUser, "bld-1")).toBe(false);
  });

  it("user with null assignments cannot access any building", () => {
    expect(canAccessBuilding(nullUser, "bld-1")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getBuildingScope (used by work orders, compliance, violations, etc.)
// ─────────────────────────────────────────────────────────────────────────────

describe("getBuildingScope", () => {
  it("admin sees all (empty where)", () => {
    expect(getBuildingScope(admin)).toEqual({});
  });

  it("scoped user gets buildingId filter", () => {
    expect(getBuildingScope(scopedUser)).toEqual({ buildingId: { in: ["bld-1", "bld-2"] } });
  });

  it("empty user gets EMPTY_SCOPE", () => {
    expect(getBuildingScope(emptyUser)).toBe(EMPTY_SCOPE);
  });

  it("null assignments gets EMPTY_SCOPE", () => {
    expect(getBuildingScope(nullUser)).toBe(EMPTY_SCOPE);
  });

  it("explicit buildingId restricts admin to single building", () => {
    const scope = getBuildingScope(admin, "bld-5");
    expect(scope).toEqual({ buildingId: { in: ["bld-5"] } });
  });

  it("explicit unassigned buildingId for scoped user returns EMPTY_SCOPE", () => {
    expect(getBuildingScope(scopedUser, "bld-99")).toBe(EMPTY_SCOPE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getTenantScope (used by metrics, export, daily-summary, etc.)
// ─────────────────────────────────────────────────────────────────────────────

describe("getTenantScope", () => {
  it("admin sees all tenants (empty where)", () => {
    expect(getTenantScope(admin)).toEqual({});
  });

  it("scoped user gets nested unit.buildingId filter", () => {
    expect(getTenantScope(scopedUser)).toEqual({ unit: { buildingId: { in: ["bld-1", "bld-2"] } } });
  });

  it("empty user gets EMPTY_SCOPE", () => {
    expect(getTenantScope(emptyUser)).toBe(EMPTY_SCOPE);
  });

  it("explicit buildingId for admin scopes to that building", () => {
    expect(getTenantScope(admin, "bld-5")).toEqual({ unit: { buildingId: "bld-5" } });
  });

  it("explicit unassigned buildingId returns EMPTY_SCOPE", () => {
    expect(getTenantScope(scopedUser, "bld-99")).toBe(EMPTY_SCOPE);
  });
});
