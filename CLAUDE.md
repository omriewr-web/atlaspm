# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**AtlasPM** — a property management portfolio visibility platform for NYC landlords/managers. Sits on top of accounting systems (Yardi/AppFolio); not an accounting system itself. Core metric: Revenue at Risk = Vacancy Loss + Arrears.

## Commands

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm run lint             # ESLint
npm run typecheck        # TypeScript type checking (tsc --noEmit)
npm run db:push          # Push schema changes to database
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed database (tsx prisma/seed.ts)
npm run db:studio        # Open Prisma Studio GUI
npm run db:generate      # Regenerate Prisma client
```

## Tech Stack

- **Framework:** Next.js 14 (App Router), React 18, TypeScript
- **Database:** PostgreSQL (Supabase) via Prisma ORM
- **Auth:** NextAuth with credentials provider, JWT sessions (24h), role-based access
- **State:** Zustand (single store in `src/stores/app-store.ts`) for UI state; TanStack React Query for server state
- **Styling:** Tailwind CSS with dark theme (see UI/Design Standards below), fonts: DM Sans / Bebas Neue / JetBrains Mono
- **Validation:** Zod schemas in `src/lib/validations.ts`
- **Path alias:** `@/*` → `./src/*`

## Architecture

### Source Structure

```
src/
├── app/(auth)/           # Login page
├── app/(dashboard)/      # All dashboard routes (alerts, compliance, daily, data, leases, legal, maintenance, reports, users, vacancies)
├── app/api/              # ~44 REST API route handlers
├── components/ui/        # Reusable UI primitives (data-table, modal, button, stat-card, etc.)
├── components/{domain}/  # Domain-specific components (building/, tenant/, legal/, compliance/, maintenance/, ai/)
├── components/layout/    # Header, sidebar, global-modals
├── hooks/                # 18 React Query hooks (use-{entity}.ts pattern)
├── lib/                  # Utilities, middleware, validation, data integrations
├── stores/               # Zustand store
└── types/                # TypeScript type definitions
```

### API Route Pattern

All API routes use `withAuth` middleware with permission strings. Authorization is scope-based via `src/lib/data-scope.ts`:

```typescript
export const GET = withAuth(async (req, { user }) => {
  const scope = getBuildingScope(user, buildingId);
  if (scope === EMPTY_SCOPE) return NextResponse.json([]);
  const data = await prisma.model.findMany({ where: { ...scope } });
  return NextResponse.json(data);
}, "permission-name");
```

- **ADMIN** sees all data; non-admins see only their assigned buildings
- Scope helpers: `getBuildingScope()`, `getTenantScope()`, `assertBuildingAccess()`, `assertTenantAccess()`
- Default-deny: users with no property assignments see nothing

### Data Fetching Pattern

Custom hooks in `src/hooks/` wrap React Query. Queries key on `["entity", selectedBuildingId, ...filters]`. Mutations invalidate relevant query keys and show toast notifications.

### Page Pattern

Dashboard pages at `src/app/(dashboard)/{feature}/page.tsx` render a corresponding `src/components/{domain}/{feature}-content.tsx` component that manages hooks, loading states, and child components.

### User Roles

`ADMIN | PM | COLLECTOR | OWNER | BROKER` — defined as Prisma enum, extended into NextAuth session.

## Core Architecture Rules

DO NOT build disconnected feature modules. Build around shared core entities that link to each other.

**Core entities:** Organization, Owner, Building, Unit, Tenant/Resident, User/Staff, Vendor/Broker/Attorney

Every operational record (Vacancy, CollectionCase, LegalCase, Violation, WorkOrder, Inspection, MoveOutAssessment) MUST link to:
- building
- unit (where applicable)
- tenant (where applicable)
- assigned user (where applicable)

**Shared ActivityEvent model** is required so all modules feed into building history, unit history, tenant history, owner dashboard, and portfolio recent activity.

**Work orders** must support source relationships: `created_from: inspection | violation | vacancy_turnover | move_out`

Never create isolated modules that cannot relate to each other.

## UI/Design Standards

### Color Palette
- **Primary:** Navy `#0a1628` (backgrounds), Gold `#c9a84c` (accents, CTAs, active states)
- **Status only:** Red `#e05c5c` (critical alerts only), Amber `#e09a3e` (warnings), Green `#4caf82` (success)
- Do not introduce other colors outside this palette

### Typography
- **DM Sans** for body text and UI labels
- **Bebas Neue** for large numbers, KPI values, and section headings
- **JetBrains Mono** for code/data where monospace is needed

### Tables & Data Display
- Alternating row shading on all tables
- Sticky column headers when scrolling
- No flashy animations on data tables — subtle transitions only (opacity, short fades)
- High data density — minimize whitespace, maximize visible information per screen

### Building References
- Always show the street address as the primary building identifier, never the entity/internal name

### Target Users
- Property managers aged 40–65 — prioritize high contrast, large tap targets, legible type sizes
- Mobile readable — managers check dashboards on phones, ensure responsive layouts work at small widths

### Empty States
- Always show an icon + helpful message describing what would appear and how to get started
- Never leave blank space with no explanation

## Database Notes

- Schema has ~48 models in `prisma/schema.prisma`
- The `Tenant` model is known to be overloaded (identity + lease terms + financial state) — see `docs/architecture-review.md`
- The `Building` model has 47+ scalar fields plus JSON fields (`lifeSafety`, `elevatorInfo`, etc.) undergoing normalization
- `scripts/reset-tenants.ts` provides ordered deletion for dev/test cleanup

## Key Libraries

- `src/lib/data-scope.ts` — Authorization scoping (critical for all API routes)
- `src/lib/api-helpers.ts` — `withAuth()` middleware, `parseBody()`, error handling
- `src/lib/validations.ts` — 26+ Zod schemas for request validation
- `src/lib/excel-import.ts` — Format detection and parsing for Excel imports (Yardi, Atlas)
- `src/lib/building-matching.ts` — Address normalization and building deduplication
- `src/lib/violation-sync.ts` / `src/lib/nyc-open-data.ts` — NYC Open Data API integration (HPD, DOB, DHCR)
- `src/lib/compliance-templates.ts` — Compliance requirement presets
- `src/lib/email-templates.ts` — HTML email templates via Resend
