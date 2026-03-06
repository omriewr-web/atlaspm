# AtlasPM Data Architecture Review

## Executive Summary

The current schema conflates **identity**, **lease terms**, **financial state**, and **collection metrics** into a single `Tenant` model. This works for an MVP but creates real problems: you can't track lease history, you can't have multiple occupants, balance is a mutable snapshot with no audit trail, and every import overwrites the previous state with no history.

The Building model has the opposite problem — structured data is buried in untyped JSON blobs (`lifeSafety`, `elevatorInfo`, `boilerInfo`, `superintendent`, `elevatorCompany`), making it impossible to query, index, or validate at the database level.

The import pipeline mixes format detection, parsing, normalization, domain transformation, and persistence into monolithic functions with no separation of concerns.

This review proposes a normalized domain model that preserves the simple spreadsheet upload experience while correctly separating concerns internally.

---

## 1. Structural Problems in the Current Schema

### 1.1 Tenant Model — Overloaded God Object

The `Tenant` model (schema line 166) combines four distinct concepts:

| Concern | Fields | Problem |
|---|---|---|
| **Person identity** | name, email, phone | Tied to a unit, not reusable |
| **Lease terms** | moveInDate, leaseExpiration, moveOutDate, leaseStatus, deposit, isStabilized | No lease history — overwritten on every import |
| **Rent schedule** | marketRent, legalRent, dhcrLegalRent, prefRent, actualRent, chargeCode | Mix of registered rents, contract rents, and charges |
| **Financial snapshot** | balance, arrearsCategory, arrearsDays, monthsOwed, collectionScore | Computed metrics stored as state — no audit trail |

**Critical issues:**
- `Tenant` has `unitId @unique` — exactly one tenant per unit. Can't model roommates, co-signers, or guarantors.
- No lease history. When a lease renews, the old terms are overwritten.
- `balance` is a mutable number with no transaction log. If an import has bad data, the balance is silently corrupted with no way to recover.
- `collectionScore` is a computed value stored as persistent state. It should be derived on read, not written on import.
- `arrearsCategory` and `arrearsDays` are also derived from `balance / marketRent` — they're redundant computed fields.

### 1.2 Building Model — JSON Blob Antipattern

The Building model (schema line 55) has **47 scalar fields** and **7 JSON blobs**:

```
lifeSafety     Json?   — 9 sub-fields, not queryable
elevatorInfo   Json?   — 5 sub-fields, not queryable
boilerInfo     Json?   — 3 sub-fields, not queryable
complianceDates Json?  — 5 sub-fields, not queryable
superintendent Json?   — contact info, not queryable
elevatorCompany Json?  — vendor info (duplicates Vendor model)
fireAlarmCompany Json? — vendor info (duplicates Vendor model)
```

**Problems:**
- `elevatorCompany` and `fireAlarmCompany` duplicate the `Vendor` model. These should be relationships.
- `superintendent` is a contact — should be a relationship to a `Contact` model or at minimum a set of scalar fields.
- `lifeSafety`, `elevatorInfo`, `boilerInfo` were recently duplicated into scalar fields (`elevator`, `sprinklerSystem`, `boilerType`, etc.) — now the same data exists in two places with no single source of truth.
- `complianceDates` duplicates data that already exists in `ComplianceItem`. It should be removed.
- None of the JSON fields can be filtered, sorted, or indexed.

### 1.3 Unit Model — Too Thin

The `Unit` model has only 5 fields. It's missing:
- `bedroomCount`, `bathroomCount` — needed for HPD registration and Section 8 voucher sizing
- `squareFeet` — unit-level, not building-level
- `legalRent` — the DHCR-registered rent is per-unit, not per-tenant
- `rentStabilized` — stabilization status is per-unit, not per-building or per-tenant

### 1.4 Relationship Problems

| Issue | Current | Should Be |
|---|---|---|
| Tenant ↔ Unit | 1:1 (unitId @unique) | Many tenants can occupy one unit over time |
| Lease | Doesn't exist | Separate entity linking tenant to unit for a time period |
| Balance history | Single mutable field | Time-series snapshots or transaction ledger |
| Legal rent | On Tenant AND DhcrRent | Should be on Unit (the registered unit, not the person) |
| Building vendors | JSON blobs | Relationships to Vendor model |

---

## 2. Proposed Domain Model

### 2A. Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Building   │────<│     Unit     │────<│    Lease     │
│              │     │              │     │              │
│  id          │     │  id          │     │  id          │
│  address     │     │  buildingId  │     │  unitId      │
│  borough     │     │  unitNumber  │     │  tenantId    │
│  bbl         │     │  bedroomCount│     │  status      │
│  portfolio   │     │  legalRent   │     │  startDate   │
│  ...         │     │  stabilized  │     │  endDate     │
└──────┬───────┘     │  isVacant    │     │  monthlyRent │
       │             └──────────────┘     │  legalRent   │
       │                                  │  deposit     │
       │                                  │  subsidyType │
       │                                  │  ...         │
       │                                  └──────┬───────┘
       │                                         │
       │             ┌──────────────┐            │
       │             │   Tenant     │────────────┘
       │             │  (person)    │
       │             │              │
       │             │  id          │
       │             │  name        │
       │             │  email       │
       │             │  phone       │
       │             └──────┬───────┘
       │                    │
       │    ┌───────────────┼───────────────┐
       │    │               │               │
       │    ▼               ▼               ▼
  ┌─────────────┐   ┌─────────────┐  ┌──────────────┐
  │   Payment   │   │  LegalCase  │  │  TenantNote  │
  │             │   │             │  │              │
  │  tenantId   │   │  leaseId    │  │  tenantId    │
  │  leaseId    │   │  stage      │  │  ...         │
  │  amount     │   │  ...        │  └──────────────┘
  │  date       │   └─────────────┘
  └─────────────┘

  ┌──────────────┐     ┌──────────────┐
  │ ImportBatch  │────<│  ImportRow   │
  │              │     │              │
  │  id          │     │  batchId     │
  │  filename    │     │  rowNumber   │
  │  format      │     │  status      │
  │  status      │     │  rawData     │
  └──────────────┘     │  error       │
                       └──────────────┘

  ┌──────────────┐     ┌──────────────────┐
  │   Building   │────<│ BuildingVendor   │───>┌────────┐
  │              │     │                  │    │ Vendor │
  └──────────────┘     │  role (super,    │    └────────┘
                       │   elevator,      │
                       │   fire_alarm)    │
                       └──────────────────┘
```

### 2B. Proposed Prisma Schema

```prisma
// ─── Core Entities ──────────────────────────────────────────────

model Building {
  id                     String   @id @default(cuid())
  yardiId                String   @unique
  buildingName           String?
  address                String
  altAddress             String?
  city                   String   @default("New York")
  state                  String   @default("NY")
  borough                String?
  zip                    String?
  block                  String?
  lot                    String?
  bbl                    String?
  entity                 String?
  portfolio              String?
  region                 String?
  type                   String   @default("Residential")

  // Ownership & Management
  owner                  String?
  ownerEmail             String?
  manager                String?
  managementCompany      String?
  einNumber              String?
  mgmtStartDate          DateTime?

  // Registration IDs
  bin                    String?
  mdrNumber              String?
  dhcrRegId              String?
  hpdRegistrationId      String?
  certificateOfOccupancy String?

  // Construction
  squareFootage          Int?
  yearBuilt              Int?
  constructionType       String?
  floors                 Int?
  floorsBelowGround      Int?
  buildingClass          String?

  // Status & Designations
  buildingStatus         String   @default("active")
  rentStabilized         Boolean  @default(false)
  landmarkStatus         String   @default("none")
  aepStatus              String   @default("none")

  // Mechanical Systems — flat scalars, no more JSON
  boilerType             String?
  boilerInstallYear      Int?
  hotWaterType           String?
  gasType                String?
  elevator               Boolean  @default(false)
  elevatorCount          Int      @default(0)
  sprinklerSystem        Boolean  @default(false)
  fireAlarmSystem        Boolean  @default(false)
  oilTank                Boolean  @default(false)

  totalUnits             Int      @default(0)
  commercialUnits        Int      @default(0)
  lastInspectionDate     DateTime?
  notes                  String?

  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  // Relations
  units                  Unit[]
  vendors                BuildingVendor[]
  assignedUsers          UserProperty[]
  importBatches          ImportBatch[]
  workOrders             WorkOrder[]
  maintenanceSchedules   MaintenanceSchedule[]
  violations             Violation[]
  complianceItems        ComplianceItem[]
  violationSyncLogs      ViolationSyncLog[]

  @@index([portfolio])
  @@index([borough])
  @@index([bbl])
  @@index([block, lot])
  @@index([buildingStatus])
  @@map("buildings")
}

model Unit {
  id             String   @id @default(cuid())
  buildingId     String
  unitNumber     String
  unitType       String?  // studio, 1br, 2br, etc.
  bedroomCount   Int?
  bathroomCount  Int?
  squareFeet     Int?
  floor          Int?
  isVacant       Boolean  @default(false)
  rentStabilized Boolean  @default(false)
  legalRent      Decimal? @db.Decimal(10, 2) // DHCR registered rent

  building       Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  leases         Lease[]
  vacancyInfo    VacancyInfo?
  workOrders     WorkOrder[]
  maintenanceSchedules MaintenanceSchedule[]

  @@unique([buildingId, unitNumber])
  @@map("units")
}

model Tenant {
  // Pure identity — no lease terms, no financial data
  id              String   @id @default(cuid())
  externalId      String?  @unique  // Yardi Resident ID, tenant_id from template
  name            String
  firstName       String?
  lastName        String?
  email           String?
  phone           String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  leases          Lease[]
  notes           TenantNote[]
  commLogs        CommLog[]
  payments        Payment[]
  tasks           Task[]
  emails          EmailLog[]

  @@map("tenants")
}

model Lease {
  id              String   @id @default(cuid())
  unitId          String
  tenantId        String
  status          String   @default("active") // active, expired, month_to_month, terminated, future

  // Term
  startDate       DateTime?
  endDate         DateTime?
  moveInDate      DateTime?
  moveOutDate     DateTime?

  // Rent
  monthlyRent     Decimal  @default(0) @db.Decimal(10, 2) // contract rent
  legalRent       Decimal  @default(0) @db.Decimal(10, 2) // registered legal rent
  preferentialRent Decimal @default(0) @db.Decimal(10, 2)
  securityDeposit Decimal  @default(0) @db.Decimal(10, 2)

  // Subsidy
  subsidyType     String?  // none, section_8, fheps, cityfheps, hasa, linc, other
  subsidyAmount   Decimal  @default(0) @db.Decimal(10, 2)
  tenantPortion   Decimal  @default(0) @db.Decimal(10, 2)

  // Balance (current snapshot — updated on import/payment)
  balance         Decimal  @default(0) @db.Decimal(10, 2)

  // Flags
  isStabilized    Boolean  @default(false)
  leaseType       String?  // renewal, initial, month_to_month, succession, sublet

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  unit            Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  tenant          Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  legalCase       LegalCase?
  payments        Payment[]
  charges         RecurringCharge[]

  @@index([unitId])
  @@index([tenantId])
  @@index([status])
  @@index([endDate])
  @@index([balance])
  @@map("leases")
}

model RecurringCharge {
  id          String   @id @default(cuid())
  leaseId     String
  chargeCode  String   // RENT, WATER, PARKING, HAP, etc.
  description String?
  amount      Decimal  @db.Decimal(10, 2)
  isSubsidy   Boolean  @default(false) // true for HAP/FHEPS payments
  createdAt   DateTime @default(now())
  lease       Lease    @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  @@index([leaseId])
  @@map("recurring_charges")
}

model BalanceSnapshot {
  id          String   @id @default(cuid())
  leaseId     String
  balance     Decimal  @db.Decimal(10, 2)
  source      String   // "import", "payment", "manual"
  importBatchId String?
  recordedAt  DateTime @default(now())
  @@index([leaseId, recordedAt(sort: Desc)])
  @@map("balance_snapshots")
}

// ─── Import Tracking ────────────────────────────────────────────

model ImportBatch {
  id          String   @id @default(cuid())
  buildingId  String?
  filename    String
  format      String   // "building-data", "tenant-rent-roll", "legal-cases", etc.
  recordCount Int      @default(0)
  status      String   @default("pending") // pending, processing, completed, completed_with_errors, failed
  errors      Json?
  importedAt  DateTime @default(now())
  building    Building? @relation(fields: [buildingId], references: [id])
  rows        ImportRow[]
  @@map("import_batches")
}

model ImportRow {
  id          String   @id @default(cuid())
  batchId     String
  rowNumber   Int
  status      String   @default("pending") // pending, imported, skipped, error
  rawData     Json     // original row data as-is from the file
  mappedData  Json?    // after header mapping and normalization
  entityType  String?  // "building", "tenant", "lease", etc.
  entityId    String?  // ID of the created/updated record
  error       String?
  batch       ImportBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  @@index([batchId])
  @@map("import_rows")
}

// ─── Building Vendors ───────────────────────────────────────────

model BuildingVendor {
  id          String   @id @default(cuid())
  buildingId  String
  vendorId    String?  // nullable — can just store contact info without a full vendor record
  role        String   // superintendent, elevator_company, fire_alarm_company, plumber, etc.
  name        String?  // inline name if no vendor record
  phone       String?
  email       String?
  notes       String?
  building    Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  vendor      Vendor?  @relation(fields: [vendorId], references: [id])
  @@unique([buildingId, role])
  @@map("building_vendors")
}
```

---

## 3. What Moves From Tenant to Lease

| Current Tenant Field | Moves To | Reason |
|---|---|---|
| `marketRent` | `Lease.monthlyRent` | Rent is a lease term, not a person attribute |
| `legalRent` | `Lease.legalRent` + `Unit.legalRent` | Registered rent is per-unit (DHCR), contract legal rent is per-lease |
| `dhcrLegalRent` | `Unit.legalRent` | DHCR registration is on the unit, not the tenant |
| `prefRent` | `Lease.preferentialRent` | Preferential rent is a lease term |
| `actualRent` | `Lease.monthlyRent` | This was the real contract rent |
| `deposit` | `Lease.securityDeposit` | Deposit is per-lease |
| `moveInDate` | `Lease.moveInDate` | Lease-level event |
| `leaseExpiration` | `Lease.endDate` | Lease term |
| `moveOutDate` | `Lease.moveOutDate` | Lease-level event |
| `leaseStatus` | `Lease.status` | Status of the lease, not the person |
| `balance` | `Lease.balance` | Balance is owed on a lease, not by a person abstractly |
| `chargeCode` | `RecurringCharge.chargeCode` | One-to-many: a lease has multiple charge codes |
| `isStabilized` | `Lease.isStabilized` + `Unit.rentStabilized` | Both unit-level (registration) and lease-level (current occupancy) |
| `arrearsCategory` | **REMOVE** — compute on read | `getArrearsCategory(balance, monthlyRent)` |
| `arrearsDays` | **REMOVE** — compute on read | `getArrearsDays(balance, monthlyRent)` |
| `monthsOwed` | **REMOVE** — compute on read | `balance / monthlyRent` |
| `collectionScore` | **REMOVE** — compute on read | `calcCollectionScore(...)` |
| `overrides` | **REMOVE** | Untyped escape hatch — replace with explicit fields |

**Stays on Tenant:** `name`, `firstName`, `lastName`, `email`, `phone`, `externalId`

---

## 4. Computed Fields Strategy

These fields are currently stored but should be computed at query time:

```typescript
// In a shared utility, not persisted in the database:
function enrichTenantView(lease: Lease): EnrichedLease {
  const monthlyRent = Number(lease.monthlyRent);
  const balance = Number(lease.balance);
  return {
    ...lease,
    arrearsCategory: getArrearsCategory(balance, monthlyRent),
    arrearsDays: getArrearsDays(balance, monthlyRent),
    monthsOwed: monthlyRent > 0 ? balance / monthlyRent : 0,
    leaseStatus: getLeaseStatus(lease.endDate),
    collectionScore: calcCollectionScore({ balance, monthlyRent, ... }),
  };
}
```

**Why:** Storing computed values creates stale data. Every time you update a balance or a payment, you have to remember to recompute all derived fields. Computing on read eliminates this entire class of bugs.

**Performance:** For list views with 2,000 tenants, computing these in JS after the query takes <5ms. Not a concern.

---

## 5. Building Model — JSON Blob Resolution

| Current JSON Field | Recommendation | Reason |
|---|---|---|
| `lifeSafety` | **DELETE** | Already duplicated as scalar fields (`sprinklerSystem`, `fireAlarmSystem`, `oilTank`). Remove the JSON, keep the scalars. |
| `elevatorInfo` | **DELETE** | Already duplicated as scalar fields (`elevator`, `elevatorCount`). CAT1/CAT5 dates belong in `ComplianceItem`. |
| `boilerInfo` | **DELETE** | Already duplicated as scalar fields (`boilerType`, `boilerInstallYear`). Inspection dates belong in `ComplianceItem`. |
| `complianceDates` | **DELETE** | This data is already modeled in `ComplianceItem`. Remove the redundant JSON. |
| `superintendent` | **MIGRATE** → `BuildingVendor` with `role = "superintendent"` | Contact info should be queryable and consistently structured. |
| `elevatorCompany` | **MIGRATE** → `BuildingVendor` with `role = "elevator_company"` | Duplicates `Vendor` model. |
| `fireAlarmCompany` | **MIGRATE** → `BuildingVendor` with `role = "fire_alarm_company"` | Duplicates `Vendor` model. |
| `utilityMeters` | **KEEP as JSON** | Truly unstructured, rarely queried, variable schema per building. JSON is appropriate here. |
| `utilityAccounts` | **KEEP as JSON** | Same rationale as utilityMeters. |

---

## 6. Import Pipeline Redesign

### Current Problems

The current `excel-import.ts` → `api/import/route.ts` pipeline:
1. Mixes parsing, format detection, and domain logic in one file
2. Has no row-level tracking — if row 47 fails, you only see it in an error array
3. Creates buildings on-the-fly during tenant import (should be separate)
4. Overwrites tenant data with no history
5. No preview/confirm flow for tenant imports (buildings have it, tenants don't)

### Proposed Pipeline Architecture

```
src/lib/import/
├── detect.ts           # detectFormat(buffer) → FormatType
├── headers.ts          # mapHeaders(rawHeaders, formatType) → ColumnMapping
├── normalize.ts        # normalizeRows(rawRows, mapping) → NormalizedRow[]
├── validate.ts         # validateRows(rows, schema) → { valid, invalid }
├── transform.ts        # transformToDomain(rows) → DomainObjects
├── collapse.ts         # collapseChargeRows(rows) → CollapsedRow[]
└── persist.ts          # persistImport(batch, domainObjects) → ImportResult
```

**Pipeline flow:**

```typescript
async function importTenantFile(buffer: Buffer, filename: string) {
  // 1. Parse Excel to raw 2D array
  const { workbook, sheet, rawRows } = parseExcel(buffer);

  // 2. Detect format (yardi-rentroll, icer-aging, atlaspm-template, generic)
  const format = detectFormat(workbook, rawRows);

  // 3. Map headers to canonical field names
  const mapping = mapHeaders(rawRows, format);

  // 4. Extract and normalize rows
  let rows = normalizeRows(rawRows, mapping);

  // 5. Collapse Yardi multi-charge rows into one row per tenant
  if (format === "yardi-rentroll") {
    rows = collapseChargeRows(rows);
  }

  // 6. Validate each row
  const { valid, invalid } = validateRows(rows, tenantUploadSchema);

  // 7. Create import batch with row-level tracking
  const batch = await createImportBatch(filename, format, rows);

  // 8. Transform to domain objects and persist
  const result = await persistImport(batch, valid);

  return { ...result, warnings: invalid };
}
```

### Yardi Charge Row Collapse (step 5 detail)

```typescript
function collapseChargeRows(rows: NormalizedRow[]): NormalizedRow[] {
  // Group by building + unit + tenant_name
  const groups = groupBy(rows, r => `${r.building_name}|${r.unit}|${r.full_name}`);

  return groups.map(group => {
    const primary = group[0]; // first row has tenant-level data
    const charges = group.map(r => ({
      code: r._charge_code,
      amount: r._charge_amount,
    }));

    // Find the RENT charge
    const rentCharge = charges.find(c =>
      ["rent", "rnt", "base rent", "contract rent"].includes(c.code?.toLowerCase())
    );

    // Find subsidy charges
    const subsidyCharge = charges.find(c =>
      ["hap", "section 8", "s8", "subsidy", "fheps"].includes(c.code?.toLowerCase())
    );

    return {
      ...primary,
      monthly_rent: rentCharge?.amount ?? primary.monthly_rent,
      subsidy_amount: subsidyCharge?.amount ?? 0,
      subsidy_type: subsidyCharge ? "section_8" : "none",
      current_charges: charges.reduce((sum, c) => sum + (c.amount ?? 0), 0),
      active_recurring_charges: charges.map(c => c.code).filter(Boolean).join(";"),
    };
  });
}
```

---

## 7. Migration Strategy

### Phase 1 — Add New Tables (Non-Breaking)
**Priority: CRITICAL**

1. Add `Lease`, `RecurringCharge`, `BalanceSnapshot`, `ImportRow`, `BuildingVendor` models
2. Add `firstName`, `lastName` to existing `Tenant` model
3. Add `bedroomCount`, `bathroomCount`, `squareFeet`, `legalRent`, `rentStabilized` to `Unit`
4. Run `prisma db push`
5. No existing code breaks — old fields still exist

### Phase 2 — Dual-Write Import
**Priority: CRITICAL**

1. Update the import route to write to BOTH old fields AND new tables
2. When importing a tenant: create/update `Tenant` (identity only) + create `Lease` + create `RecurringCharge`s
3. Write `BalanceSnapshot` on every import
4. Old API endpoints still read from old `Tenant` model — nothing breaks

### Phase 3 — Migrate Reads
**Priority: IMPORTANT**

1. Update API endpoints to read from `Lease` joined with `Tenant` instead of flat `Tenant`
2. Update `TenantView` type to pull lease fields from the `Lease` relation
3. Compute `arrearsCategory`, `arrearsDays`, `collectionScore` at query time
4. Frontend continues to work — `TenantView` shape stays the same

### Phase 4 — Clean Up
**Priority: OPTIONAL**

1. Remove redundant fields from `Tenant` model (marketRent, balance, leaseExpiration, etc.)
2. Remove JSON blobs from `Building` (lifeSafety, elevatorInfo, boilerInfo, complianceDates)
3. Migrate `superintendent`/`elevatorCompany`/`fireAlarmCompany` to `BuildingVendor`
4. Delete `DhcrRent` model (replaced by `Unit.legalRent`)
5. Delete old `building-import.ts` (replaced by `parsers/buildingParser.ts`)

---

## 8. Concrete Refactors — Prioritized

### CRITICAL (do first — data integrity)

| # | Refactor | Effort | Impact |
|---|---|---|---|
| 1 | Create `Lease` model, update import to dual-write | 1 day | Enables lease history, fixes 1:1 tenant-unit limitation |
| 2 | Create `BalanceSnapshot` model, write on import | 2 hrs | Audit trail for every balance change |
| 3 | Create `ImportRow` model for row-level tracking | 2 hrs | Debug failed imports, re-run individual rows |
| 4 | Stop storing computed fields (collectionScore, arrearsCategory, arrearsDays, monthsOwed) | 3 hrs | Eliminates stale data bugs |
| 5 | Add preview/confirm flow to tenant import (like buildings have) | 3 hrs | Prevent accidental overwrites |

### IMPORTANT (do second — data quality)

| # | Refactor | Effort | Impact |
|---|---|---|---|
| 6 | Create `RecurringCharge` model | 2 hrs | Proper charge tracking instead of flat chargeCode field |
| 7 | Move `legalRent`, `rentStabilized` to Unit | 1 hr | Correct domain modeling — registration is per-unit |
| 8 | Add `bedroomCount`, `squareFeet` to Unit | 30 min | Needed for HPD, Section 8, vacancy marketing |
| 9 | Create `BuildingVendor` junction, migrate superintendent/elevatorCompany/fireAlarmCompany | 2 hrs | Queryable contacts, eliminates JSON duplication |
| 10 | Delete JSON blobs (`lifeSafety`, `elevatorInfo`, `boilerInfo`, `complianceDates`) | 1 hr | Remove dual-source-of-truth problem |
| 11 | Extract import pipeline into `src/lib/import/` with separate stages | 4 hrs | Testable, maintainable import code |

### OPTIONAL (do when convenient)

| # | Refactor | Effort | Impact |
|---|---|---|---|
| 12 | Add `firstName`/`lastName` to Tenant, auto-parse from `full_name` | 30 min | Better search, forms, correspondence |
| 13 | Delete `DhcrRent` model (superseded by `Unit.legalRent`) | 30 min | Remove dead model |
| 14 | Delete `building-import.ts` (superseded by `parsers/buildingParser.ts`) | 5 min | Remove dead code |
| 15 | Add `Lease.subsidyType`/`subsidyAmount`/`tenantPortion` | 1 hr | Proper subsidy tracking for Section 8/FHEPS |
| 16 | Add soft-delete to Tenant (don't delete on move-out, mark inactive) | 1 hr | Preserve history for legal, audit |
| 17 | Connection pooling config for Prisma (fix MaxClientsInSessionMode errors) | 30 min | Eliminate the Supabase pool exhaustion errors in dev |

---

## 9. What NOT to Change

1. **The upload UX.** Staff upload a flat Excel file. The import pipeline normalizes internally. This is correct.
2. **The Building scalar fields.** The recent addition of `borough`, `bbl`, `elevator`, `sprinklerSystem`, etc. was the right call. Keep these.
3. **The `Vendor` model.** It's clean and well-structured. Just connect it to buildings via `BuildingVendor`.
4. **The `ComplianceItem` model.** It's well-designed with proper frequency, status, and vendor relationships.
5. **The `WorkOrder` model.** Clean relationships to building, unit, tenant, vendor. No changes needed.
6. **The scoring functions.** `calcCollectionScore`, `getArrearsCategory`, etc. are correct — just stop persisting their output.
