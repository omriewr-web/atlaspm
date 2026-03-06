# AtlasPM Product Roadmap

You are a senior full-stack engineer working on an existing production codebase called AtlasPM.

The project already exists and is built using:

- Next.js (App Router)
- TypeScript
- Prisma
- PostgreSQL
- Tailwind CSS

You must extend the existing application, not create a new one.

## Do NOT:

- create a new project
- redesign the entire architecture
- rebuild the database from scratch
- replace existing working modules

## Instead:

- Add new modules cleanly to the existing AtlasPM system.
- Follow the current architecture and patterns.

---

## Product Context

AtlasPM is an operations intelligence and transparency platform for property management portfolios.

It is NOT:

- an accounting system
- a rent payment system
- a replacement for property accounting platforms like Yardi Systems or AppFolio.

AtlasPM sits on top of existing accounting systems and focuses on portfolio visibility, operational tracking, and owner transparency.

The platform exists because property managers currently track important information using:

- spreadsheets
- emails
- phone calls
- internal score sheets

Owners constantly request updates regarding:

- vacancy
- leasing progress
- arrears / collections
- legal cases
- violations
- maintenance work
- operational activity

AtlasPM should centralize this information and eliminate manual reporting.

Owners should be able to understand the portfolio in under 10 seconds.

---

## Core AtlasPM Pillars

AtlasPM tracks five operational areas:

1. Vacancy
2. Collections / Arrears
3. Legal Cases
4. Violations
5. Work Orders / Operational Activity

These give owners visibility into:

- revenue at risk
- operational activity
- compliance issues
- building condition
- where money is being spent

---

## Core Concept: Revenue at Risk

Revenue at Risk = Vacancy Loss + Arrears

This metric should appear prominently in dashboards.

Owners should see:

- potential monthly rent
- collected rent
- vacancy loss
- arrears
- revenue at risk

---

## Features to Implement

Extend the existing AtlasPM application with the following modules.

### 1. Vacancy Pipeline

Create a vacancy tracking system where units move through stages:

Vacant → Renovation → Listed → Showing → Application → Lease Signed

Each vacancy record should include:

- building
- unit
- asking rent
- broker
- number of showings
- days vacant
- stage
- notes
- timestamps

This should behave like a pipeline workflow similar to a CRM board.

### 2. Collections Tracker

Track tenants with arrears and the actions being taken.

Each record should include:

- building
- unit
- tenant name
- balance owed
- days late
- collection status
- assigned staff member
- notes
- last action date
- next action date

Statuses may include:

- New Arrears
- Reminder Sent
- Payment Plan
- Notice Served
- Legal Review
- Legal Filed

The goal is to show what action is being taken, not just the balance.

### 3. Legal Case Tracker

Track eviction/legal progression.

Suggested stages:

Notice Served → Petition Filed → Court Date → Stipulation → Judgment → Eviction → Resolved

Each case should include:

- building
- unit
- tenant
- arrears amount
- attorney
- next court date
- status
- notes
- last update

### 4. Violations Tracker

Allow property managers and owners to track building violations and remediation work.

Each violation record should include:

- building
- unit (if applicable)
- agency
- violation number
- violation type
- violation class or severity
- issue date
- status
- assigned staff or vendor
- remediation notes
- target completion date
- certification date

Suggested statuses:

- New
- Inspected
- Scope Created
- Vendor Assigned
- Work In Progress
- Ready for Reinspection
- Filed / Certified
- Closed

Violations should show remediation progress.

### 5. Work Order System

Create a simple, dummy-proof work order system inspired by the usability of MaintainX, but tailored to property management.

The goal is operational tracking, not a complex maintenance ERP.

Work orders should be fast to create and easy for staff to update.

Each work order should include:

- building
- unit (optional)
- category
- priority
- description
- assigned staff or vendor
- estimated cost
- actual cost
- status
- notes
- photos
- completion date

Statuses:

- Open
- Assigned
- In Progress
- Completed
- Closed

Categories may include:

- Tenant Maintenance
- Vacancy Turnover
- Violation Remediation
- Building Repair
- Routine Maintenance
- CapEx Task

Work orders should feed the portfolio activity timeline automatically.

### 6. Recurring Inspection System

Create an inspection module for recurring property inspections.

Examples:

- monthly property manager inspection
- weekly field inspection
- move-in inspection
- move-out inspection

Inspections should use checklist templates.

Inspection items should allow statuses such as:

- Pass
- Fail
- Needs Attention
- Not Applicable

If an inspection item is marked Fail or Needs Attention, the system should automatically create a related work order for repair.

This work order should appear in:

- the work order system
- the building activity timeline
- the owner dashboard

Owners should be able to see a monthly snapshot of building condition and operational activity.

### 7. Move-In / Move-Out Inspection and Deposit Workflow

Create structured move-in and move-out inspections.

During a move-out inspection, the property manager should be able to document damages and apply preset charges from a configurable price list.

Example charges:

- furniture left behind = $500
- apartment not cleaned = $300
- wall damage = configurable
- missing keys = configurable

The system should:

- calculate total charges automatically
- compare charges with the security deposit
- recommend full or partial deposit return
- generate a draft email summarizing the charges for the outgoing tenant

The property manager should be able to review and edit the email before sending.

---

## Portfolio Activity Timeline

Create an activity timeline showing events such as:

- work order created
- work order completed
- vacancy created
- unit listed
- lease signed
- arrears updated
- legal case created
- violation remediation updates
- inspection completed

This becomes the operational history of the building and portfolio.

---

## Owner Dashboard

Create a simplified owner view showing:

**Revenue metrics:**

- vacancy loss
- arrears
- revenue at risk

**Operational metrics:**

- open work orders
- completed repairs
- violations open
- inspections completed
- legal cases

Recent portfolio activity.

The goal is to reduce owner update calls and provide transparent portfolio visibility.

---

## Implementation Requirements

Follow the existing AtlasPM architecture.

Deliver:

- Prisma model updates
- API routes
- React components
- dashboard widgets
- data tables for each module
- activity timeline system

The system should be:

- simple
- modular
- scalable
- easy for property managers and field staff to use

Avoid unnecessary complexity.

---

## UX Philosophy

AtlasPM should feel like a portfolio command center.

The interface should be:

- clean
- professional
- highly scannable
- data-driven
- easy for property managers and owners to understand.
