/**
 * Centralized data scoping for authorization.
 *
 * DEFAULT DENY: non-admin users with no assigned properties see NOTHING.
 * Admin users see everything. Non-admin with assignments see only their buildings.
 */

interface ScopeUser {
  role: string;
  assignedProperties?: string[] | null;
}

/** Sentinel value: when returned, the route should return an empty result set. */
export const EMPTY_SCOPE = Symbol("EMPTY_SCOPE");

type ScopeResult = { buildingId: { in: string[] } } | Record<string, never> | typeof EMPTY_SCOPE;

/**
 * Returns a Prisma where clause fragment for building-level queries.
 *
 * Usage: `const where = getBuildingScope(user); if (where === EMPTY_SCOPE) return [];`
 * Then spread `where` into your Prisma where clause for the buildingId field.
 */
export function getBuildingScope(user: ScopeUser, explicitBuildingId?: string | null): ScopeResult {
  if (explicitBuildingId) {
    // Even with an explicit ID, non-admin users must own it
    if (user.role === "ADMIN") {
      return { buildingId: { in: [explicitBuildingId] } };
    }
    const assigned = user.assignedProperties ?? [];
    if (assigned.length === 0 || !assigned.includes(explicitBuildingId)) {
      return EMPTY_SCOPE;
    }
    return { buildingId: { in: [explicitBuildingId] } };
  }

  if (user.role === "ADMIN") return {};

  const assigned = user.assignedProperties ?? [];
  if (assigned.length === 0) return EMPTY_SCOPE;

  return { buildingId: { in: assigned } };
}

/**
 * Same as getBuildingScope but for the buildings table itself (uses `id` not `buildingId`).
 */
export function getBuildingIdScope(user: ScopeUser, explicitBuildingId?: string | null) {
  if (explicitBuildingId) {
    if (user.role === "ADMIN") {
      return { id: explicitBuildingId };
    }
    const assigned = user.assignedProperties ?? [];
    if (assigned.length === 0 || !assigned.includes(explicitBuildingId)) {
      return EMPTY_SCOPE;
    }
    return { id: explicitBuildingId };
  }

  if (user.role === "ADMIN") return {};

  const assigned = user.assignedProperties ?? [];
  if (assigned.length === 0) return EMPTY_SCOPE;

  return { id: { in: assigned } };
}

/**
 * Returns a Prisma where clause for tenant queries (scoped through unit → building).
 */
export function getTenantScope(user: ScopeUser, explicitBuildingId?: string | null) {
  if (explicitBuildingId) {
    if (user.role === "ADMIN") {
      return { unit: { buildingId: explicitBuildingId } };
    }
    const assigned = user.assignedProperties ?? [];
    if (assigned.length === 0 || !assigned.includes(explicitBuildingId)) {
      return EMPTY_SCOPE;
    }
    return { unit: { buildingId: explicitBuildingId } };
  }

  if (user.role === "ADMIN") return {};

  const assigned = user.assignedProperties ?? [];
  if (assigned.length === 0) return EMPTY_SCOPE;

  return { unit: { buildingId: { in: assigned } } };
}
