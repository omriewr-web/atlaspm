# Lease Model Dual-Write Migration Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Lease model integration so it becomes the structured source of truth for occupancy/terms, while keeping all existing Tenant-based reads working.

**Architecture:** The Lease model already exists in the schema with most fields. We need to: (1) add missing fields (organizationId, buildingId, isCurrent, moveInDate, moveOutDate), (2) complete dual-write in all tenant write paths that don't yet write to Lease, (3) create lease helper functions for future read migration, (4) backfill existing tenants into Lease records.

**Tech Stack:** Prisma ORM, PostgreSQL (Supabase), Next.js 14 API routes, TypeScript

---

## Current State Assessment

### What already exists:
- `Lease` model in schema (line 922) with: id, unitId, tenantId, leaseStart, leaseEnd, monthlyRent, legalRent, preferentialRent, subsidyType, subsidyAmount, tenantPortion, status (LeaseStatus enum), isStabilized, securityDeposit, notes
- `LeaseOccupant` model for roommates/co-signers
- `RecurringCharge` model linked to Lease
- `BalanceSnapshot` model linked to both Tenant and Lease
- `ImportRow` model for row-level tracking
- Dual-write in `commitRentRollImport.ts` (lines 215-238) — writes Lease + BalanceSnapshot on every rent roll import

### What's missing:
1. **Lease schema gaps:** No `organizationId`, `buildingId`, `isCurrent`, `moveInDate`, `moveOutDate` fields
2. **Tenant create API** (`POST /api/tenants`) — creates Tenant but no Lease
3. **Tenant update API** (`PATCH /api/tenants/[id]`) — updates Tenant but no Lease
4. **Legacy rent-roll import** (`rent-roll-import.service.ts`) — updates Lease partially (only if active lease exists), doesn't create new Leases
5. **No lease helper functions** (getCurrentLease, getLeaseHistory, etc.)
6. **No backfill script** for existing tenants without Lease records

### Write paths that need dual-write:
| Path | File | Current Lease Write |
|------|------|-------------------|
| Rent roll import (new pipeline) | `src/lib/importer/commit/commitRentRollImport.ts` | YES - upsert Lease + BalanceSnapshot |
| Rent roll import (legacy) | `src/lib/services/rent-roll-import.service.ts` | PARTIAL - updates existing, doesn't create |
| Tenant create | `src/app/api/tenants/route.ts` POST | NO |
| Tenant update | `src/app/api/tenants/[id]/route.ts` PATCH | NO |
| Tenant delete | `src/app/api/tenants/[id]/route.ts` DELETE | NO (doesn't end Lease) |

---

## Chunk 1: Schema Enhancement + Migration

### Task 1: Add missing fields to Lease model

**Files:**
- Modify: `prisma/schema.prisma:922-956`

- [ ] **Step 1: Add fields to Lease model**

Add `organizationId`, `buildingId`, `isCurrent`, `moveInDate`, `moveOutDate` to the existing Lease model. Add relations and indexes.

```prisma
model Lease {
  id               String            @id @default(cuid())
  organizationId   String?
  buildingId       String?
  unitId           String
  tenantId         String?
  isCurrent        Boolean           @default(true)
  leaseStart       DateTime?
  leaseEnd         DateTime?
  moveInDate       DateTime?
  moveOutDate      DateTime?
  monthlyRent      Decimal           @default(0) @db.Decimal(10, 2)
  legalRent        Decimal           @default(0) @db.Decimal(10, 2)
  preferentialRent Decimal           @default(0) @db.Decimal(10, 2)
  subsidyType      String?
  subsidyAmount    Decimal           @default(0) @db.Decimal(10, 2)
  tenantPortion    Decimal           @default(0) @db.Decimal(10, 2)
  renewalStatus    String?
  leaseType        String?
  status           LeaseStatus       @default(ACTIVE)
  paymentFrequency PaymentFrequency  @default(MONTHLY)
  billingStatus    BillingStatus     @default(ACTIVE)
  isStabilized     Boolean           @default(false)
  householdSize    Int?
  securityDeposit  Decimal           @default(0) @db.Decimal(10, 2)
  notes            String?           @db.Text
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  organization     Organization?     @relation(fields: [organizationId], references: [id])
  building         Building?         @relation(fields: [buildingId], references: [id])
  unit             Unit              @relation(fields: [unitId], references: [id], onDelete: Cascade)
  tenant           Tenant?           @relation(fields: [tenantId], references: [id], onDelete: SetNull)
  occupants        LeaseOccupant[]
  recurringCharges RecurringCharge[]
  balanceSnapshots BalanceSnapshot[]

  @@index([organizationId])
  @@index([buildingId])
  @@index([unitId])
  @@index([tenantId])
  @@index([status])
  @@index([isCurrent])
  @@index([leaseEnd])
  @@map("leases")
}
```

Also add the `leases` relation to the `Organization` and `Building` models:
- Add `leases Lease[]` to `Organization` model
- Add `leases Lease[]` to `Building` model

- [ ] **Step 2: Run prisma generate to verify schema compiles**

Run: `npx prisma generate`
Expected: SUCCESS - no errors

- [ ] **Step 3: Create migration**

Run: `npx prisma migrate dev --name add-lease-fields`
Expected: Migration created successfully. Existing Lease rows get `isCurrent=true`, `organizationId=null`, `buildingId=null`, `moveInDate=null`, `moveOutDate=null`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (no errors — we only added optional fields with defaults)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add organizationId, buildingId, isCurrent, moveInDate, moveOutDate to Lease model"
```

---

## Chunk 2: Lease Helper Functions

### Task 2: Create lease helper module

**Files:**
- Create: `src/lib/lease-helpers.ts`

- [ ] **Step 1: Create the lease helper module**

```typescript
/**
 * Lease resolution helpers.
 * These respect the existing org/building scoping patterns from data-scope.ts.
 */
import { prisma } from "@/lib/prisma";

interface ScopeUser {
  role: string;
  assignedProperties?: string[] | null;
  organizationId?: string | null;
}

const FULL_ORG_ROLES = ["SUPER_ADMIN", "ADMIN", "ACCOUNT_ADMIN"];

/**
 * Build a scoping filter for lease queries based on user role.
 * Mirrors the patterns in data-scope.ts but for the Lease model directly.
 */
function getLeaseOrgFilter(user: ScopeUser): Record<string, unknown> {
  if (user.role === "SUPER_ADMIN") return {};
  if (FULL_ORG_ROLES.includes(user.role)) {
    return { organizationId: user.organizationId };
  }
  const assigned = user.assignedProperties ?? [];
  if (assigned.length === 0) return { id: "__NO_ACCESS__" }; // impossible match
  return { buildingId: { in: assigned } };
}

/**
 * Get the current active lease for a tenant.
 * Returns the lease marked isCurrent=true with status ACTIVE, or the most recent one.
 */
export async function getCurrentLeaseForTenant(
  tenantId: string,
  user?: ScopeUser,
) {
  const where: Record<string, unknown> = {
    tenantId,
    isCurrent: true,
    ...(user ? getLeaseOrgFilter(user) : {}),
  };

  const lease = await prisma.lease.findFirst({
    where,
    include: {
      unit: { select: { id: true, unitNumber: true, buildingId: true } },
      recurringCharges: { where: { active: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return lease;
}

/**
 * Get the current active lease for a unit.
 * Returns the lease marked isCurrent=true, or null if unit is vacant.
 */
export async function getCurrentLeaseForUnit(
  unitId: string,
  user?: ScopeUser,
) {
  const where: Record<string, unknown> = {
    unitId,
    isCurrent: true,
    ...(user ? getLeaseOrgFilter(user) : {}),
  };

  const lease = await prisma.lease.findFirst({
    where,
    include: {
      tenant: { select: { id: true, name: true, email: true, phone: true } },
      recurringCharges: { where: { active: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return lease;
}

/**
 * Get all leases for a unit, ordered by creation date descending (most recent first).
 */
export async function getLeaseHistoryForUnit(
  unitId: string,
  user?: ScopeUser,
) {
  const where: Record<string, unknown> = {
    unitId,
    ...(user ? getLeaseOrgFilter(user) : {}),
  };

  return prisma.lease.findMany({
    where,
    include: {
      tenant: { select: { id: true, name: true } },
      balanceSnapshots: { orderBy: { snapshotDate: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all leases for a tenant, ordered by creation date descending.
 */
export async function getLeaseHistoryForTenant(
  tenantId: string,
  user?: ScopeUser,
) {
  const where: Record<string, unknown> = {
    tenantId,
    ...(user ? getLeaseOrgFilter(user) : {}),
  };

  return prisma.lease.findMany({
    where,
    include: {
      unit: {
        select: {
          id: true,
          unitNumber: true,
          building: { select: { id: true, address: true } },
        },
      },
      balanceSnapshots: { orderBy: { snapshotDate: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create or update a lease for a tenant+unit combination during dual-write.
 * This is the canonical function for creating/syncing Lease records.
 *
 * Uses deterministic ID pattern: `{tenantId}-lease` for the current/primary lease.
 * This matches the pattern already used in commitRentRollImport.ts.
 */
export async function upsertCurrentLease(params: {
  tenantId: string;
  unitId: string;
  buildingId: string;
  organizationId: string | null;
  leaseStart: Date | null;
  leaseEnd: Date | null;
  moveInDate?: Date | null;
  moveOutDate?: Date | null;
  monthlyRent: number;
  legalRent?: number;
  preferentialRent?: number;
  securityDeposit?: number;
  isStabilized?: boolean;
  subsidyType?: string | null;
  subsidyAmount?: number;
  tenantPortion?: number;
  status?: string;
}) {
  const leaseId = `${params.tenantId}-lease`;
  const normalizedStatus = params.status
    ? params.status
    : params.leaseEnd
      ? (params.leaseEnd < new Date() ? "EXPIRED" : "ACTIVE")
      : "MONTH_TO_MONTH";

  return prisma.lease.upsert({
    where: { id: leaseId },
    create: {
      id: leaseId,
      organizationId: params.organizationId,
      buildingId: params.buildingId,
      unitId: params.unitId,
      tenantId: params.tenantId,
      isCurrent: true,
      leaseStart: params.leaseStart,
      leaseEnd: params.leaseEnd,
      moveInDate: params.moveInDate ?? params.leaseStart,
      moveOutDate: params.moveOutDate ?? null,
      monthlyRent: params.monthlyRent,
      legalRent: params.legalRent ?? 0,
      preferentialRent: params.preferentialRent ?? 0,
      securityDeposit: params.securityDeposit ?? 0,
      isStabilized: params.isStabilized ?? false,
      subsidyType: params.subsidyType ?? null,
      subsidyAmount: params.subsidyAmount ?? 0,
      tenantPortion: params.tenantPortion ?? 0,
      status: normalizedStatus as any,
    },
    update: {
      organizationId: params.organizationId,
      buildingId: params.buildingId,
      leaseStart: params.leaseStart,
      leaseEnd: params.leaseEnd,
      moveInDate: params.moveInDate ?? undefined,
      moveOutDate: params.moveOutDate ?? undefined,
      monthlyRent: params.monthlyRent,
      securityDeposit: params.securityDeposit ?? undefined,
      isStabilized: params.isStabilized ?? undefined,
      status: normalizedStatus as any,
    },
  });
}

/**
 * End a lease (mark as no longer current) when a tenant is deleted or moves out.
 */
export async function endCurrentLease(tenantId: string) {
  const leaseId = `${tenantId}-lease`;
  const existing = await prisma.lease.findUnique({ where: { id: leaseId } });
  if (!existing) return null;

  return prisma.lease.update({
    where: { id: leaseId },
    data: {
      isCurrent: false,
      status: "TERMINATED",
      moveOutDate: new Date(),
    },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/lease-helpers.ts
git commit -m "feat: add lease helper functions for current lease resolution and dual-write"
```

---

## Chunk 3: Dual-Write in Tenant Create/Update/Delete

### Task 3: Add dual-write to tenant create API

**Files:**
- Modify: `src/app/api/tenants/route.ts:116-182` (POST handler)

- [ ] **Step 1: Add Lease creation inside the existing transaction**

After the tenant is created (line 173), add a call to create the Lease record inside the same `prisma.$transaction` block. Import `upsertCurrentLease` is NOT usable inside a transaction (it uses the global prisma), so inline the lease creation:

At the top of the file, add no new imports needed — the transaction client `tx` already has `.lease`.

Inside the transaction, after `const created = await tx.tenant.create(...)` and before `await tx.unit.update(...)`, add:

```typescript
    // Dual-write: create Lease record
    const building = await tx.unit.findUnique({
      where: { id: unit.id },
      select: { buildingId: true, building: { select: { organizationId: true } } },
    });

    await tx.lease.upsert({
      where: { id: `${created.id}-lease` },
      create: {
        id: `${created.id}-lease`,
        organizationId: building?.building?.organizationId ?? null,
        buildingId: building?.buildingId ?? null,
        unitId: unit.id,
        tenantId: created.id,
        isCurrent: true,
        leaseStart: data.moveInDate ? new Date(data.moveInDate) : null,
        leaseEnd: leaseExp,
        moveInDate: data.moveInDate ? new Date(data.moveInDate) : null,
        monthlyRent: data.marketRent ?? 0,
        legalRent: data.legalRent ?? 0,
        securityDeposit: data.deposit ?? 0,
        isStabilized: data.isStabilized ?? false,
        status: leaseExp ? (leaseExp < new Date() ? "EXPIRED" : "ACTIVE") : "MONTH_TO_MONTH",
      },
      update: {},
    });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

### Task 4: Add dual-write to tenant update API

**Files:**
- Modify: `src/app/api/tenants/[id]/route.ts:37-86` (PATCH handler)

- [ ] **Step 1: Add Lease sync after tenant update**

After `const tenant = await prisma.tenant.update(...)` at line 84, add Lease sync:

```typescript
  // Dual-write: sync Lease record
  const unitInfo = await prisma.unit.findUnique({
    where: { id: tenant.unitId },
    select: { buildingId: true, building: { select: { organizationId: true } } },
  });

  await prisma.lease.upsert({
    where: { id: `${id}-lease` },
    create: {
      id: `${id}-lease`,
      organizationId: unitInfo?.building?.organizationId ?? null,
      buildingId: unitInfo?.buildingId ?? null,
      unitId: tenant.unitId,
      tenantId: id,
      isCurrent: true,
      leaseStart: tenant.moveInDate,
      leaseEnd: tenant.leaseExpiration,
      moveInDate: tenant.moveInDate,
      monthlyRent: Number(tenant.marketRent),
      legalRent: Number(tenant.legalRent),
      securityDeposit: Number(tenant.deposit),
      isStabilized: tenant.isStabilized,
      status: tenant.leaseExpiration
        ? (tenant.leaseExpiration < new Date() ? "EXPIRED" : "ACTIVE")
        : "MONTH_TO_MONTH",
    },
    update: {
      leaseStart: tenant.moveInDate,
      leaseEnd: tenant.leaseExpiration,
      moveInDate: tenant.moveInDate,
      monthlyRent: Number(tenant.marketRent),
      legalRent: Number(tenant.legalRent),
      securityDeposit: Number(tenant.deposit),
      isStabilized: tenant.isStabilized,
      status: tenant.leaseExpiration
        ? (tenant.leaseExpiration < new Date() ? "EXPIRED" : "ACTIVE")
        : "MONTH_TO_MONTH",
    },
  });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

### Task 5: Add lease termination to tenant delete API

**Files:**
- Modify: `src/app/api/tenants/[id]/route.ts:88-103` (DELETE handler)

- [ ] **Step 1: End the lease before deleting the tenant**

Inside the existing transaction (before `await tx.tenant.delete()`), add:

```typescript
    // End the associated lease (if any)
    const leaseId = `${id}-lease`;
    const existingLease = await tx.lease.findUnique({ where: { id: leaseId } });
    if (existingLease) {
      await tx.lease.update({
        where: { id: leaseId },
        data: { isCurrent: false, status: "TERMINATED", moveOutDate: new Date() },
      });
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit all dual-write changes**

```bash
git add src/app/api/tenants/route.ts src/app/api/tenants/[id]/route.ts
git commit -m "feat: add dual-write to Lease on tenant create, update, and delete"
```

---

## Chunk 4: Dual-Write in Import Pipelines

### Task 6: Enhance commitRentRollImport dual-write with new fields

**Files:**
- Modify: `src/lib/importer/commit/commitRentRollImport.ts:215-227`

- [ ] **Step 1: Add organizationId, buildingId, isCurrent, moveInDate, moveOutDate to the existing lease upsert**

The existing code at line 215 already does `prisma.lease.upsert`. Update it to include the new fields:

```typescript
      await prisma.lease.upsert({
        where: { id: leaseId },
        create: {
          id: leaseId,
          organizationId: ctx.organizationId ?? null,
          buildingId,
          unitId: unitRecord.id,
          tenantId: tenant.id,
          isCurrent: true,
          leaseStart: t.moveIn ? new Date(t.moveIn) : null,
          leaseEnd: leaseExp,
          moveInDate: t.moveIn ? new Date(t.moveIn) : null,
          moveOutDate: t.moveOut ? new Date(t.moveOut) : null,
          monthlyRent: t.marketRent,
          legalRent: 0,
          preferentialRent: 0,
          securityDeposit: t.deposit,
          status: normalizedLeaseStatus as any,
          isStabilized: false,
        },
        update: {
          organizationId: ctx.organizationId ?? null,
          buildingId,
          isCurrent: true,
          leaseStart: t.moveIn ? new Date(t.moveIn) : null,
          leaseEnd: leaseExp,
          moveInDate: t.moveIn ? new Date(t.moveIn) : null,
          moveOutDate: t.moveOut ? new Date(t.moveOut) : null,
          monthlyRent: t.marketRent,
          securityDeposit: t.deposit,
          status: normalizedLeaseStatus as any,
        },
      });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

### Task 7: Add full dual-write to legacy rent-roll-import.service.ts

**Files:**
- Modify: `src/lib/services/rent-roll-import.service.ts:193-254`

- [ ] **Step 1: Create Lease for new tenants (not just update existing)**

In the tenant creation block (around line 217), after `const created = await prisma.tenant.create(...)`, add Lease creation:

```typescript
      // Dual-write: create Lease for new tenant
      await prisma.lease.upsert({
        where: { id: `${tenantId}-lease` },
        create: {
          id: `${tenantId}-lease`,
          unitId,
          tenantId,
          buildingId,
          isCurrent: true,
          leaseStart: row.moveInDate ?? null,
          leaseEnd: row.leaseExpiration ?? null,
          moveInDate: row.moveInDate ?? null,
          moveOutDate: row.moveOutDate ?? null,
          monthlyRent: row.chargeAmount || row.marketRent,
          status: row.leaseExpiration
            ? (row.leaseExpiration < new Date() ? "EXPIRED" : "ACTIVE")
            : "MONTH_TO_MONTH",
        },
        update: {
          leaseStart: row.moveInDate ?? undefined,
          leaseEnd: row.leaseExpiration ?? undefined,
          moveInDate: row.moveInDate ?? undefined,
          moveOutDate: row.moveOutDate ?? undefined,
          monthlyRent: row.chargeAmount || row.marketRent,
        },
      });
```

- [ ] **Step 2: Create Lease when no active lease found for existing tenants**

Replace the existing lease update block (lines 234-254) with:

```typescript
    // ── Dual-write: Lease sync ──
    const activeLease = await prisma.lease.findFirst({
      where: { tenantId, status: "ACTIVE" },
      select: { id: true, leaseEnd: true, leaseStart: true },
    });

    const leaseUpdate: Record<string, any> = {};
    if (row.leaseExpiration) leaseUpdate.leaseEnd = row.leaseExpiration;
    if (row.moveInDate) {
      leaseUpdate.leaseStart = row.moveInDate;
      leaseUpdate.moveInDate = row.moveInDate;
    }
    if (row.moveOutDate) leaseUpdate.moveOutDate = row.moveOutDate;
    const rentAmount = row.chargeAmount || row.marketRent;
    if (rentAmount) leaseUpdate.monthlyRent = rentAmount;

    if (activeLease) {
      if (Object.keys(leaseUpdate).length > 0) {
        await prisma.lease.update({ where: { id: activeLease.id }, data: leaseUpdate });
      }
    } else {
      // No active lease — create one
      await prisma.lease.upsert({
        where: { id: `${tenantId}-lease` },
        create: {
          id: `${tenantId}-lease`,
          unitId,
          tenantId,
          buildingId,
          isCurrent: true,
          leaseStart: row.moveInDate ?? null,
          leaseEnd: row.leaseExpiration ?? null,
          moveInDate: row.moveInDate ?? null,
          moveOutDate: row.moveOutDate ?? null,
          monthlyRent: rentAmount || 0,
          status: row.leaseExpiration
            ? (row.leaseExpiration < new Date() ? "EXPIRED" : "ACTIVE")
            : "MONTH_TO_MONTH",
        },
        update: leaseUpdate,
      });
    }
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/importer/commit/commitRentRollImport.ts src/lib/services/rent-roll-import.service.ts
git commit -m "feat: complete dual-write in both import pipelines with new Lease fields"
```

---

## Chunk 5: Backfill Script

### Task 8: Create idempotent backfill script

**Files:**
- Create: `scripts/backfill-leases.ts`

- [ ] **Step 1: Write the backfill script**

```typescript
/**
 * Backfill Lease records from existing Tenant data.
 *
 * Rules:
 * - Idempotent: skips tenants that already have a Lease with id `{tenantId}-lease`
 * - Creates one "current" lease per tenant
 * - Derives lease fields from Tenant.moveInDate, leaseExpiration, marketRent, etc.
 * - Logs rows that cannot be safely inferred
 * - Uses pgbouncer URL with connection_limit=1 (per Supabase best practice)
 *
 * Usage: npx tsx scripts/backfill-leases.ts [--dry-run]
 */

import { PrismaClient } from "@prisma/client";

const dryRun = process.argv.includes("--dry-run");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ["warn", "error"],
});

async function main() {
  console.log(`Backfill Leases — ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("=".repeat(60));

  // Fetch all tenants with their unit and building info
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      unitId: true,
      name: true,
      marketRent: true,
      legalRent: true,
      prefRent: true,
      actualRent: true,
      deposit: true,
      moveInDate: true,
      leaseExpiration: true,
      moveOutDate: true,
      leaseStatus: true,
      isStabilized: true,
      chargeCode: true,
      unit: {
        select: {
          buildingId: true,
          building: { select: { organizationId: true } },
        },
      },
    },
  });

  console.log(`Found ${tenants.length} tenants`);

  // Fetch existing lease IDs to skip duplicates
  const existingLeases = await prisma.lease.findMany({
    where: {
      id: { in: tenants.map((t) => `${t.id}-lease`) },
    },
    select: { id: true },
  });
  const existingLeaseIds = new Set(existingLeases.map((l) => l.id));
  console.log(`Found ${existingLeaseIds.size} existing leases (will be skipped)`);

  let created = 0;
  let skipped = 0;
  let warnings: string[] = [];

  for (const t of tenants) {
    const leaseId = `${t.id}-lease`;

    if (existingLeaseIds.has(leaseId)) {
      skipped++;
      continue;
    }

    // Derive status
    let status: string;
    if (t.moveOutDate) {
      status = "TERMINATED";
    } else if (t.leaseExpiration) {
      status = t.leaseExpiration < new Date() ? "EXPIRED" : "ACTIVE";
    } else {
      status = "MONTH_TO_MONTH";
    }

    const isCurrent = status === "ACTIVE" || status === "MONTH_TO_MONTH";

    // Warn if we can't infer much
    if (!t.moveInDate && !t.leaseExpiration && Number(t.marketRent) === 0) {
      warnings.push(`Tenant ${t.id} ("${t.name}"): no moveInDate, no leaseExpiration, zero rent — creating minimal lease`);
    }

    if (!dryRun) {
      await prisma.lease.create({
        data: {
          id: leaseId,
          organizationId: t.unit.building?.organizationId ?? null,
          buildingId: t.unit.buildingId,
          unitId: t.unitId,
          tenantId: t.id,
          isCurrent,
          leaseStart: t.moveInDate,
          leaseEnd: t.leaseExpiration,
          moveInDate: t.moveInDate,
          moveOutDate: t.moveOutDate,
          monthlyRent: t.marketRent,
          legalRent: t.legalRent,
          preferentialRent: t.prefRent,
          securityDeposit: t.deposit,
          isStabilized: t.isStabilized,
          status: status as any,
        },
      });
    }

    created++;
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Results: ${created} created, ${skipped} skipped (already had lease)`);

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) {
      console.log(`  - ${w}`);
    }
  }

  console.log(dryRun ? "\n(Dry run — no changes made)" : "\nDone.");
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Test with dry run**

Run: `npx tsx scripts/backfill-leases.ts --dry-run`
Expected: Reports how many leases would be created, shows warnings for incomplete data. No DB changes.

- [ ] **Step 3: Run live (if dry run looks good)**

Run: `npx tsx scripts/backfill-leases.ts`
Expected: Creates Lease records for all tenants that don't have one.

- [ ] **Step 4: Verify by querying**

Run: `npx prisma studio` — check `leases` table, verify records exist with correct buildingId, organizationId, isCurrent values.

- [ ] **Step 5: Commit**

```bash
git add scripts/backfill-leases.ts
git commit -m "feat: add idempotent lease backfill script"
```

---

## Chunk 6: Read-Path Prep + Verification

### Task 9: Add lease data to tenant detail API response

**Files:**
- Modify: `src/app/api/tenants/[id]/route.ts:10-34` (GET handler)

The GET handler already includes `leases` in the response (lines 22-28). No changes needed — it already fetches leases with recurringCharges and balanceSnapshots.

- [ ] **Step 1: Verify the GET response includes lease data**

Read the file and confirm lines 22-28 include the lease join. Already done — no code change needed.

### Task 10: Export lease helpers from a barrel (optional convenience)

No barrel needed — direct imports from `@/lib/lease-helpers` are fine.

### Task 11: Verify all high-risk flows

- [ ] **Step 1: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS with zero errors

- [ ] **Step 2: Verify dev server starts**

Run: `npm run dev` — check it starts without errors, hit a few pages in the browser.

- [ ] **Step 3: Verify build succeeds**

Run: `npm run build`
Expected: PASS — full production build with no errors

- [ ] **Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: lease model dual-write migration complete"
```

---

## Migration Notes

### What remains on Tenant temporarily
All existing Tenant fields remain untouched:
- `unitId`, `marketRent`, `legalRent`, `dhcrLegalRent`, `prefRent`, `actualRent`
- `chargeCode`, `isStabilized`, `deposit`
- `moveInDate`, `leaseExpiration`, `moveOutDate`
- `balance`, `arrearsCategory`, `arrearsDays`, `monthsOwed`, `leaseStatus`, `collectionScore`
- `overrides`

All existing reads (hooks, services, AI context, scoring) continue reading from Tenant.

### What now writes to Lease
Every write path now dual-writes:
1. `commitRentRollImport.ts` — upserts Lease with org/building/isCurrent fields
2. `rent-roll-import.service.ts` — creates or updates Lease for every tenant
3. `POST /api/tenants` — creates Lease inside the same transaction
4. `PATCH /api/tenants/[id]` — syncs Lease after tenant update
5. `DELETE /api/tenants/[id]` — ends Lease (isCurrent=false, TERMINATED) before deleting tenant

### What should be migrated next (Phase 3)
1. **Migrate read paths**: Update `getTenantScope` and service queries to join through Lease for lease-specific fields
2. **Compute on read**: Stop storing `arrearsCategory`, `arrearsDays`, `monthsOwed`, `collectionScore` — compute them from Lease.balance / Lease.monthlyRent
3. **Move balance to Lease**: Balance belongs on the Lease, not the Tenant (person vs. contract)
4. **TenantView type**: Pull lease fields from the Lease relation instead of flat Tenant fields
5. **Remove 1:1 constraint**: Drop `unitId @unique` on Tenant once all reads use Lease for occupancy resolution
