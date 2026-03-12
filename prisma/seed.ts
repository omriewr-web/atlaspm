import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
function monthStart(monthsBack: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  // ── 0. Bootstrap admin ──
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !username || !password) {
    console.warn("Skipping admin seed: BOOTSTRAP_ADMIN_* env variables not set.");
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Admin",
      username,
      passwordHash: hash,
      role: "ADMIN",
      active: true,
    },
  });
  console.log("✓ Admin user ensured");
  const adminId = admin.id;

  // ── 1. Load existing buildings, units, tenants ──
  const buildings = await prisma.building.findMany({
    select: { id: true, address: true, totalUnits: true, portfolio: true },
  });
  if (buildings.length === 0) {
    console.log("No buildings in DB — seed buildings first via import.");
    return;
  }
  console.log(`Found ${buildings.length} buildings`);

  const allUnits = await prisma.unit.findMany({
    select: { id: true, buildingId: true, unitNumber: true, isVacant: true, isResidential: true },
  });
  const vacantResUnits = allUnits.filter((u) => u.isVacant && u.isResidential);
  const occupiedResUnits = allUnits.filter((u) => !u.isVacant && u.isResidential);

  const allTenants = await prisma.tenant.findMany({
    select: { id: true, unitId: true, name: true, balance: true, arrearsCategory: true, collectionScore: true },
    orderBy: { balance: "desc" },
  });
  console.log(`Found ${allTenants.length} tenants, ${vacantResUnits.length} vacant residential units`);

  // Helper to get buildingId for a unit
  const unitBuildingMap = new Map(allUnits.map((u) => [u.id, u.buildingId]));

  // ── 2. VENDORS (18 records) ──
  console.log("\n── Seeding Vendors ──");
  const vendorData = [
    { id: "vendor-plumb-1", name: "Rodriguez & Sons Plumbing", contactType: "vendor", specialty: "plumber", phone: "718-555-0101", email: "info@rodriguezplumbing.com", notes: "NYC Master Plumber Lic #1284. 24hr emergency." },
    { id: "vendor-plumb-2", name: "Apex Plumbing Corp", contactType: "vendor", specialty: "plumber", phone: "718-555-0102", email: "dispatch@apexplumbing.com", notes: "Licensed #1847. Specializes in high-rise." },
    { id: "vendor-plumb-3", name: "BronxFlow Plumbing", contactType: "vendor", specialty: "plumber", phone: "347-555-0103", email: "service@bronxflow.com", notes: "Lic #2103. Boiler & plumbing combo." },
    { id: "vendor-elec-1", name: "PowerLine Electric Inc", contactType: "vendor", specialty: "electrician", phone: "212-555-0201", email: "jobs@powerlineelectric.com", notes: "NYC Master Electrician Lic #12459." },
    { id: "vendor-elec-2", name: "CityBright Electrical", contactType: "vendor", specialty: "electrician", phone: "718-555-0202", email: "info@citybright.com", notes: "Lic #11782. Panel upgrades & code work." },
    { id: "vendor-pest-1", name: "Metro Pest Solutions", contactType: "vendor", specialty: "exterminator", phone: "718-555-0301", email: "schedule@metropest.com", notes: "DEC Lic #C-11447. Monthly contracts available." },
    { id: "vendor-pest-2", name: "ClearHome Exterminating", contactType: "vendor", specialty: "exterminator", phone: "347-555-0302", email: "service@clearhome.com", notes: "DEC Lic #C-12993. Heat treatment specialist." },
    { id: "vendor-elev-1", name: "Champion Elevator Services", contactType: "vendor", specialty: "elevator", phone: "212-555-0401", email: "maintenance@championelev.com", notes: "DOB Lic #ELV-3847. Annual inspection contracts." },
    { id: "vendor-boiler-1", name: "AllSeason Boiler & Heating", contactType: "vendor", specialty: "boiler", phone: "718-555-0501", email: "emergency@allseasonboiler.com", notes: "DOB Lic #BO-2291. Oil-to-gas conversions." },
    { id: "vendor-atty-1", name: "Goldstein & Associates", contactType: "attorney", specialty: "attorney", phone: "212-555-0601", email: "intake@goldsteinlaw.com", notes: "Housing court. Nonpayment & holdover specialist." },
    { id: "vendor-atty-2", name: "Kaplan, Rivera & Chen LLP", contactType: "attorney", specialty: "attorney", phone: "212-555-0602", email: "landlord@krclaw.com", notes: "Full-service landlord-tenant. Bronx & Manhattan HC." },
    { id: "vendor-atty-3", name: "Hartman Legal Group", contactType: "attorney", specialty: "attorney", phone: "718-555-0603", email: "cases@hartmanlegal.com", notes: "Brooklyn housing court. Eviction specialist." },
    { id: "vendor-marshal-1", name: "Michael D. Torres", contactType: "marshal", specialty: "marshal", phone: "212-555-0701", email: "mtorres@nycmarshal.com", notes: "NYC City Marshal, Badge #17. Bronx & Manhattan." },
    { id: "vendor-marshal-2", name: "Patricia Hawkins", contactType: "marshal", specialty: "marshal", phone: "718-555-0702", email: "phawkins@nycmarshal.com", notes: "NYC City Marshal, Badge #23. Brooklyn & Queens." },
    { id: "vendor-gc-1", name: "TriBoro General Contracting", contactType: "vendor", specialty: "general_contractor", phone: "718-555-0801", email: "bids@triborogc.com", notes: "HIC Lic #2049731. Turnover renovations." },
    { id: "vendor-gc-2", name: "Uptown Restoration LLC", contactType: "vendor", specialty: "general_contractor", phone: "212-555-0802", email: "projects@uptownrestoration.com", notes: "HIC Lic #2118340. Facade & interior." },
    { id: "vendor-lock-1", name: "QuickTurn Locksmith", contactType: "vendor", specialty: "locksmith", phone: "347-555-0901", email: "dispatch@quickturnlock.com", notes: "DCA Lic #2063187. 24/7 lockout service." },
    { id: "vendor-hvac-1", name: "ArcticAir HVAC Corp", contactType: "vendor", specialty: "hvac", phone: "718-555-1001", email: "service@arcticairhvac.com", notes: "EPA 608 certified. Split & central systems." },
  ];
  for (const v of vendorData) {
    await prisma.vendor.upsert({
      where: { id: v.id },
      update: {},
      create: { id: v.id, name: v.name, contactType: v.contactType, specialty: v.specialty, phone: v.phone, email: v.email, notes: v.notes },
    });
  }
  console.log(`✓ ${vendorData.length} vendors upserted`);

  // Build vendor lookup by specialty
  const vendorsBySpecialty: Record<string, string[]> = {};
  for (const v of vendorData) {
    const s = v.specialty || "general";
    if (!vendorsBySpecialty[s]) vendorsBySpecialty[s] = [];
    vendorsBySpecialty[s].push(v.id);
  }

  // ── 3. WORK ORDERS (45 records) ──
  console.log("\n── Seeding Work Orders ──");
  const woTemplates = [
    { title: "No heat in unit", priority: "URGENT" as const, category: "HVAC" as const, desc: "Tenant reports no heat or hot water since yesterday. Boiler may need emergency service.", vendor: "boiler" },
    { title: "Leaking pipe under kitchen sink", priority: "HIGH" as const, category: "PLUMBING" as const, desc: "Active leak damaging cabinet below. Needs shutoff and repair.", vendor: "plumber" },
    { title: "Broken window latch", priority: "MEDIUM" as const, category: "GENERAL" as const, desc: "Window will not lock properly. Security concern — ground floor unit.", vendor: "general_contractor" },
    { title: "Roach infestation reported", priority: "HIGH" as const, category: "OTHER" as const, desc: "Tenant reports heavy roach activity in kitchen and bathroom. Multiple units may be affected.", vendor: "exterminator" },
    { title: "Elevator not stopping at floor 3", priority: "URGENT" as const, category: "GENERAL" as const, desc: "Elevator intermittently skips 3rd floor. DOB inspection coming next month.", vendor: "elevator" },
    { title: "Bathroom ceiling water damage", priority: "HIGH" as const, category: "PLUMBING" as const, desc: "Water stain expanding on bathroom ceiling. Likely leak from above unit.", vendor: "plumber" },
    { title: "Buzzer/intercom not working", priority: "MEDIUM" as const, category: "ELECTRICAL" as const, desc: "Tenant cannot buzz visitors in. Intercom system panel may need replacement.", vendor: "electrician" },
    { title: "Toilet running continuously", priority: "MEDIUM" as const, category: "PLUMBING" as const, desc: "Toilet flapper or fill valve needs replacement. Wasting water.", vendor: "plumber" },
    { title: "Hallway light fixture out", priority: "LOW" as const, category: "ELECTRICAL" as const, desc: "3rd floor hallway fixture not working. Bulb replaced already — likely ballast.", vendor: "electrician" },
    { title: "Front door lock broken", priority: "URGENT" as const, category: "GENERAL" as const, desc: "Building front door lock mechanism jammed. Building not secure.", vendor: "locksmith" },
    { title: "Radiator banging and leaking", priority: "HIGH" as const, category: "HVAC" as const, desc: "Radiator producing loud banging and dripping water from valve.", vendor: "plumber" },
    { title: "Peeling paint — lead concern", priority: "HIGH" as const, category: "GENERAL" as const, desc: "Peeling paint in child-occupied unit. Pre-1978 building — lead test required.", vendor: "general_contractor" },
    { title: "Gas odor reported in basement", priority: "URGENT" as const, category: "GENERAL" as const, desc: "Faint gas smell near boiler room. Con Ed notified. Need plumber to check connections.", vendor: "plumber" },
    { title: "AC unit leaking into wall", priority: "MEDIUM" as const, category: "HVAC" as const, desc: "Window AC condensation running down interior wall. Causing paint damage.", vendor: "hvac" },
    { title: "Sink faucet won't shut off", priority: "HIGH" as const, category: "PLUMBING" as const, desc: "Kitchen faucet handle stripped — cannot fully close. Water bill concern.", vendor: "plumber" },
    { title: "Mouse activity in unit", priority: "MEDIUM" as const, category: "OTHER" as const, desc: "Tenant found droppings in kitchen. Requested exterminator visit.", vendor: "exterminator" },
    { title: "Garbage disposal jammed", priority: "LOW" as const, category: "APPLIANCE" as const, desc: "Disposal unit seized. May need motor replacement.", vendor: "plumber" },
    { title: "Fire escape rust/deterioration", priority: "HIGH" as const, category: "GENERAL" as const, desc: "Visible rust on 4th floor fire escape. Needs inspection and possible LL 11 filing.", vendor: "general_contractor" },
    { title: "Smoke detector chirping", priority: "MEDIUM" as const, category: "ELECTRICAL" as const, desc: "Hard-wired smoke detector beeping intermittently. Battery backup or unit replacement needed.", vendor: "electrician" },
    { title: "Roof leak over top floor unit", priority: "URGENT" as const, category: "GENERAL" as const, desc: "Active water intrusion during rain. Bucket catching drips. Roofer needed ASAP.", vendor: "general_contractor" },
    { title: "Bathtub drain clogged", priority: "MEDIUM" as const, category: "PLUMBING" as const, desc: "Water backing up in bathtub. Drain snake needed.", vendor: "plumber" },
    { title: "Outlet sparking when used", priority: "URGENT" as const, category: "ELECTRICAL" as const, desc: "Kitchen outlet producing sparks. Fire hazard — do not use until repaired.", vendor: "electrician" },
    { title: "Stove burner not igniting", priority: "MEDIUM" as const, category: "APPLIANCE" as const, desc: "Front left burner clicks but won't light. Igniter may need cleaning or replacement.", vendor: "plumber" },
    { title: "Mailbox lock broken", priority: "LOW" as const, category: "GENERAL" as const, desc: "Tenant's individual mailbox lock is damaged. USPS mail access issue.", vendor: "locksmith" },
    { title: "Water heater pilot keeps going out", priority: "HIGH" as const, category: "HVAC" as const, desc: "Thermocouple likely failing. Tenants have no hot water intermittently.", vendor: "boiler" },
    { title: "Ceiling fan wobbling dangerously", priority: "MEDIUM" as const, category: "ELECTRICAL" as const, desc: "Living room ceiling fan shaking at all speeds. Mount may be loose.", vendor: "electrician" },
    { title: "Basement flooding after rain", priority: "HIGH" as const, category: "PLUMBING" as const, desc: "2 inches of standing water in basement after heavy rain. Sump pump not engaging.", vendor: "plumber" },
    { title: "Exterior door closer broken", priority: "LOW" as const, category: "GENERAL" as const, desc: "Rear exit door closer arm snapped. Door won't self-close — security issue.", vendor: "general_contractor" },
    { title: "Refrigerator not cooling", priority: "HIGH" as const, category: "APPLIANCE" as const, desc: "Fridge running but not cold. Food spoiling. Compressor or thermostat issue.", vendor: "general_contractor" },
    { title: "Mold in bathroom", priority: "HIGH" as const, category: "GENERAL" as const, desc: "Black mold visible on bathroom ceiling and wall. Ventilation inadequate.", vendor: "general_contractor" },
  ];

  // Status distribution: OPEN 30%, IN_PROGRESS 25%, COMPLETED 25%, ON_HOLD 20%
  const statuses: Array<"OPEN" | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD"> = [];
  for (let i = 0; i < 14; i++) statuses.push("OPEN");
  for (let i = 0; i < 11; i++) statuses.push("IN_PROGRESS");
  for (let i = 0; i < 11; i++) statuses.push("COMPLETED");
  for (let i = 0; i < 9; i++) statuses.push("ON_HOLD");

  const sourceTypes = ["manual", "manual", "manual", "manual", "manual", "violation", "violation", "violation", "tenant_request", "tenant_request", "schedule"];

  let woCount = 0;
  for (let i = 0; i < 45; i++) {
    const woId = `seed-wo-${String(i).padStart(3, "0")}`;
    const tmpl = woTemplates[i % woTemplates.length];
    const bldg = pick(buildings);
    const bldgUnits = allUnits.filter((u) => u.buildingId === bldg.id && u.isResidential);
    const unit = bldgUnits.length > 0 ? pick(bldgUnits) : null;
    const status = statuses[i];
    const sourceType = pick(sourceTypes);

    // Vendor assignment: 100% for COMPLETED/IN_PROGRESS, 60% for OPEN, 50% ON_HOLD
    const vendorSpecialty = tmpl.vendor;
    const vendorPool = vendorsBySpecialty[vendorSpecialty] || vendorsBySpecialty["general_contractor"] || [];
    const assignVendor = status === "COMPLETED" || status === "IN_PROGRESS" || Math.random() < 0.6;
    const vendorId = assignVendor && vendorPool.length > 0 ? pick(vendorPool) : null;

    const createdDaysAgo = randBetween(3, 90);
    const createdAt = daysAgo(createdDaysAgo);

    let completedDate: Date | null = null;
    let dueDate: Date | null = null;
    if (status === "COMPLETED") {
      completedDate = daysAgo(randBetween(1, createdDaysAgo - 1));
    }
    if (status === "OPEN" || status === "IN_PROGRESS") {
      if (Math.random() < 0.4) {
        // Some overdue, some upcoming
        dueDate = Math.random() < 0.4 ? daysAgo(randBetween(1, 14)) : daysFromNow(randBetween(1, 30));
      }
    }

    const unitSuffix = unit ? ` — ${unit.unitNumber}` : "";

    await prisma.workOrder.upsert({
      where: { id: woId },
      update: {},
      create: {
        id: woId,
        title: `${tmpl.title}${unitSuffix}`,
        description: tmpl.desc,
        status,
        priority: tmpl.priority,
        category: tmpl.category,
        buildingId: bldg.id,
        unitId: unit?.id,
        vendorId,
        assignedToId: adminId,
        createdById: adminId,
        sourceType,
        dueDate,
        completedDate,
        createdAt,
      },
    });
    woCount++;

    // Add 2-3 comments per WO
    const commentCount = randBetween(2, 3);
    const commentTexts = [
      "Inspected the unit. Confirmed the issue. Parts ordered.",
      "Vendor scheduled for next Tuesday morning.",
      "Tenant was home — provided access. Work in progress.",
      "Called vendor for update — says parts backordered 5 days.",
      "Completed repair. Tenant confirmed issue resolved.",
      "Needs follow-up — temporary fix in place.",
      "Super checked and confirmed this needs professional attention.",
      "Left note on door — tenant not home. Rescheduling.",
      "HPD violation linked to this issue. Priority elevated.",
      "Second visit completed. Monitoring for recurrence.",
    ];
    for (let c = 0; c < commentCount; c++) {
      const commentId = `seed-woc-${String(i).padStart(3, "0")}-${c}`;
      await prisma.workOrderComment.upsert({
        where: { id: commentId },
        update: {},
        create: {
          id: commentId,
          workOrderId: woId,
          authorId: adminId,
          text: pick(commentTexts),
          createdAt: daysAgo(randBetween(1, createdDaysAgo)),
        },
      });
    }
  }
  console.log(`✓ ${woCount} work orders upserted with comments`);

  // ── 4. MAINTENANCE SCHEDULES (10 records) ──
  console.log("\n── Seeding Maintenance Schedules ──");
  const scheduleData = [
    { id: "seed-sched-001", title: "Annual boiler inspection", desc: "DOB-required annual boiler inspection. Inspect burner, flue, controls, and safety devices.", freq: "ANNUALLY" as const, auto: true, daysToNext: 45 },
    { id: "seed-sched-002", title: "Monthly exterminator service", desc: "Scheduled pest control treatment for common areas and reported units.", freq: "MONTHLY" as const, auto: true, daysToNext: 12 },
    { id: "seed-sched-003", title: "Quarterly fire alarm test", desc: "Test all fire alarm pull stations, smoke detectors, and notification appliances per FDNY.", freq: "QUARTERLY" as const, auto: false, daysToNext: 60 },
    { id: "seed-sched-004", title: "Annual elevator inspection", desc: "DOB Cat 1 and Cat 5 elevator inspection. Coordinate with Champion Elevator.", freq: "ANNUALLY" as const, auto: true, daysToNext: -15 },
    { id: "seed-sched-005", title: "Monthly roof inspection", desc: "Visual inspection of roof membrane, drains, and flashing. Document any ponding.", freq: "MONTHLY" as const, auto: false, daysToNext: 5 },
    { id: "seed-sched-006", title: "Semi-annual HVAC filter replacement", desc: "Replace all HVAC filters in common area units. Check belt tension.", freq: "QUARTERLY" as const, auto: true, daysToNext: 30 },
    { id: "seed-sched-007", title: "Weekly hallway cleaning", desc: "Mop and sanitize all common hallways, stairwells, and lobby.", freq: "WEEKLY" as const, auto: false, daysToNext: 3 },
    { id: "seed-sched-008", title: "Annual Local Law 11 facade inspection", desc: "FISP cycle facade inspection per LL 11/98. Engage licensed PE or RA.", freq: "ANNUALLY" as const, auto: false, daysToNext: 120 },
    { id: "seed-sched-009", title: "Quarterly backflow preventer test", desc: "DEP-required annual backflow prevention device testing. Licensed tester.", freq: "QUARTERLY" as const, auto: true, daysToNext: -5 },
    { id: "seed-sched-010", title: "Annual gas line inspection", desc: "Local Law 152 gas piping inspection. Certified by master plumber.", freq: "ANNUALLY" as const, auto: true, daysToNext: 90 },
  ];
  for (const s of scheduleData) {
    const bldg = pick(buildings);
    await prisma.maintenanceSchedule.upsert({
      where: { id: s.id },
      update: {},
      create: {
        id: s.id,
        title: s.title,
        description: s.desc,
        frequency: s.freq,
        autoCreateWorkOrder: s.auto,
        nextDueDate: s.daysToNext >= 0 ? daysFromNow(s.daysToNext) : daysAgo(-s.daysToNext),
        lastRunDate: daysAgo(randBetween(30, 180)),
        buildingId: bldg.id,
      },
    });
  }
  console.log(`✓ ${scheduleData.length} maintenance schedules upserted`);

  // ── 5. TURNOVERS (10 records) ──
  console.log("\n── Seeding Turnovers ──");
  const turnoverStatuses: Array<"PENDING_INSPECTION" | "INSPECTION_DONE" | "SCOPE_CREATED" | "VENDORS_ASSIGNED" | "READY_TO_LIST" | "LISTED" | "COMPLETE"> = [
    "PENDING_INSPECTION", "PENDING_INSPECTION",
    "INSPECTION_DONE", "INSPECTION_DONE",
    "SCOPE_CREATED",
    "VENDORS_ASSIGNED", "VENDORS_ASSIGNED",
    "READY_TO_LIST",
    "LISTED",
    "COMPLETE",
  ];
  const turnoverUnits = pickN(vacantResUnits, Math.min(10, vacantResUnits.length));
  let turnoverCount = 0;
  for (let i = 0; i < turnoverUnits.length; i++) {
    const unit = turnoverUnits[i];
    const toId = `seed-turnover-${String(i).padStart(3, "0")}`;
    const status = turnoverStatuses[i];
    const startDaysAgo = randBetween(5, 60);

    await prisma.turnoverWorkflow.upsert({
      where: { id: toId },
      update: {},
      create: {
        id: toId,
        unitId: unit.id,
        buildingId: unit.buildingId,
        triggeredBy: "MANUAL",
        moveOutDate: daysAgo(startDaysAgo + randBetween(0, 14)),
        status,
        inspectionDate: ["PENDING_INSPECTION"].includes(status) ? null : daysAgo(startDaysAgo - 3),
        inspectionNotes: ["PENDING_INSPECTION"].includes(status) ? null : "Unit needs full paint, kitchen floor has damage, bathroom caulk needs replacement.",
        scopeOfWork: ["PENDING_INSPECTION", "INSPECTION_DONE"].includes(status) ? null : "Full paint (2 coats), kitchen floor tile repair, bathroom re-caulk, general cleaning, lock change.",
        estimatedCost: ["PENDING_INSPECTION", "INSPECTION_DONE"].includes(status) ? null : randBetween(2500, 8000),
        completedAt: status === "COMPLETE" ? daysAgo(randBetween(1, 5)) : null,
        listedDate: status === "LISTED" ? daysAgo(randBetween(1, 10)) : null,
        assignedToUserId: adminId,
        isActive: status !== "COMPLETE",
        createdAt: daysAgo(startDaysAgo),
      },
    });

    // Vendor assignments for non-early stages
    if (!["PENDING_INSPECTION", "INSPECTION_DONE"].includes(status)) {
      const trades = [
        { trade: "paint", vendorName: "TriBoro General Contracting", vendorId: "vendor-gc-1" },
        { trade: "plumbing", vendorName: "Rodriguez & Sons Plumbing", vendorId: "vendor-plumb-1" },
      ];
      for (let t = 0; t < trades.length; t++) {
        const tvaId = `seed-tva-${String(i).padStart(3, "0")}-${t}`;
        const isComplete = status === "COMPLETE" || (status === "READY_TO_LIST" && Math.random() > 0.3);
        await prisma.turnoverVendorAssignment.upsert({
          where: { id: tvaId },
          update: {},
          create: {
            id: tvaId,
            turnoverWorkflowId: toId,
            vendorId: trades[t].vendorId,
            vendorName: trades[t].vendorName,
            trade: trades[t].trade,
            status: isComplete ? "COMPLETED" : "SCHEDULED",
            scheduledDate: daysAgo(randBetween(1, 14)),
            completedDate: isComplete ? daysAgo(randBetween(1, 5)) : null,
            cost: randBetween(800, 3500),
          },
        });
      }
    }
    turnoverCount++;
  }
  console.log(`✓ ${turnoverCount} turnovers upserted with vendor assignments`);

  // ── 6. COLLECTION CASES + NOTES (25 cases) ──
  console.log("\n── Seeding Collection Cases & Notes ──");
  const tenantsWithBalance = allTenants.filter((t) => Number(t.balance) > 500);
  const collectionTenants = tenantsWithBalance.slice(0, 25);
  const collStatuses = [
    "monitoring", "monitoring", "monitoring", "monitoring", "monitoring",
    "monitoring", "monitoring", "monitoring", "monitoring", "monitoring",
    "demand_sent", "demand_sent", "demand_sent", "demand_sent", "demand_sent",
    "demand_sent",
    "legal_referred", "legal_referred", "legal_referred", "legal_referred",
    "payment_plan", "payment_plan",
    "resolved", "resolved", "resolved",
  ];
  const collNoteTemplates: Array<{ content: string; actionType: "CALLED" | "LEFT_VOICEMAIL" | "TEXTED" | "EMAILED" | "NOTICE_SENT" | "PAYMENT_PLAN" | "PARTIAL_PAYMENT" | "PROMISE_TO_PAY" | "SENT_TO_LEGAL" | "OTHER" }> = [
    { content: "Called tenant, no answer. Left voicemail requesting callback.", actionType: "LEFT_VOICEMAIL" },
    { content: "Spoke with tenant. Says they are waiting on unemployment check. Will follow up in 2 weeks.", actionType: "CALLED" },
    { content: "Tenant promised payment by end of month. Documenting for follow-up.", actionType: "PROMISE_TO_PAY" },
    { content: "Sent 5-day demand letter via certified mail. Tracking #: 9400111899223100.", actionType: "NOTICE_SENT" },
    { content: "Tenant entered payment plan — $500/month starting April 1st. Written agreement signed.", actionType: "PAYMENT_PLAN" },
    { content: "Referred to Goldstein & Associates for legal action. Balance exceeds 90 days.", actionType: "SENT_TO_LEGAL" },
    { content: "Partial payment received — $750. Balance reduced but still delinquent.", actionType: "PARTIAL_PAYMENT" },
    { content: "Emailed tenant at address on file. No bounce-back. Awaiting response.", actionType: "EMAILED" },
    { content: "Tenant not responding to calls or letters. Escalating to demand notice.", actionType: "OTHER" },
    { content: "Texted tenant reminder about outstanding balance. Read receipt confirmed.", actionType: "TEXTED" },
    { content: "Spoke with tenant's emergency contact. Left message about balance.", actionType: "CALLED" },
    { content: "Second demand letter sent. 14-day cure period beginning.", actionType: "NOTICE_SENT" },
  ];

  let collCount = 0;
  for (let i = 0; i < collectionTenants.length; i++) {
    const tenant = collectionTenants[i];
    const bldgId = unitBuildingMap.get(tenant.unitId)!;
    const status = collStatuses[i];
    const ccId = `seed-cc-${String(i).padStart(3, "0")}`;
    const createdDaysAgo = randBetween(15, 90);

    await prisma.collectionCase.upsert({
      where: { id: ccId },
      update: {},
      create: {
        id: ccId,
        buildingId: bldgId,
        unitId: tenant.unitId,
        tenantId: tenant.id,
        assignedUserId: adminId,
        balanceOwed: Number(tenant.balance),
        daysLate: randBetween(30, 180),
        status,
        lastActionDate: status === "resolved" ? daysAgo(randBetween(1, 10)) : daysAgo(randBetween(1, 60)),
        nextActionDate: status === "resolved" ? null : daysFromNow(randBetween(1, 14)),
        isActive: status !== "resolved",
        createdAt: daysAgo(createdDaysAgo),
      },
    });

    // 2-4 notes per case, spread over time
    const noteCount = randBetween(2, 4);
    for (let n = 0; n < noteCount; n++) {
      const cnId = `seed-cn-${String(i).padStart(3, "0")}-${n}`;
      const tmpl = pick(collNoteTemplates);
      // Make some tenants "stale" — last note 35+ days ago
      const isStale = i % 5 === 0 && n === noteCount - 1;
      const noteDaysAgo = isStale ? randBetween(35, 60) : randBetween(1, createdDaysAgo);

      await prisma.collectionNote.upsert({
        where: { id: cnId },
        update: {},
        create: {
          id: cnId,
          tenantId: tenant.id,
          buildingId: bldgId,
          authorId: adminId,
          content: tmpl.content,
          actionType: tmpl.actionType,
          followUpDate: Math.random() < 0.3 ? daysFromNow(randBetween(3, 21)) : null,
          createdAt: daysAgo(noteDaysAgo),
        },
      });
    }
    collCount++;
  }
  console.log(`✓ ${collCount} collection cases upserted with notes`);

  // ── 7. LEGAL CASES (15 records) ──
  console.log("\n── Seeding Legal Cases ──");
  // Use tenants with highest balances that don't already have legal cases
  const existingLegalTenantIds = new Set(
    (await prisma.legalCase.findMany({ select: { tenantId: true } })).map((lc) => lc.tenantId)
  );
  const legalCandidates = tenantsWithBalance.filter((t) => !existingLegalTenantIds.has(t.id)).slice(0, 15);

  const legalStages: Array<"NOTICE_SENT" | "NONPAYMENT" | "COURT_DATE" | "STIPULATION" | "WARRANT" | "SETTLED" | "EVICTION"> = [
    "NOTICE_SENT", "NOTICE_SENT", "NOTICE_SENT",
    "NONPAYMENT", "NONPAYMENT",
    "COURT_DATE", "COURT_DATE", "COURT_DATE",
    "STIPULATION", "STIPULATION",
    "WARRANT", "WARRANT",
    "SETTLED",
    "EVICTION",
    "NOTICE_SENT",
  ];
  const attorneys = ["vendor-atty-1", "vendor-atty-2", "vendor-atty-3"];
  const marshals = ["vendor-marshal-1", "vendor-marshal-2"];

  let legalCount = 0;
  for (let i = 0; i < legalCandidates.length; i++) {
    const tenant = legalCandidates[i];
    const bldgId = unitBuildingMap.get(tenant.unitId)!;
    const stage = legalStages[i];
    const lcId = `seed-lc-${String(i).padStart(3, "0")}`;
    const filedDaysAgo = randBetween(30, 180);

    let courtDate: Date | null = null;
    if (stage === "COURT_DATE") {
      courtDate = i === 5 ? daysAgo(3) : daysFromNow(randBetween(7, 45)); // one overdue
    }

    await prisma.legalCase.upsert({
      where: { id: lcId },
      update: {},
      create: {
        id: lcId,
        tenantId: tenant.id,
        buildingId: bldgId,
        unitId: tenant.unitId,
        attorneyId: pick(attorneys),
        assignedUserId: adminId,
        marshalId: stage === "WARRANT" || stage === "EVICTION" ? pick(marshals) : null,
        inLegal: stage !== "SETTLED",
        stage,
        caseNumber: `LT-2025-${String(10000 + i).padStart(5, "0")}`,
        filedDate: daysAgo(filedDaysAgo),
        courtDate,
        arrearsBalance: Number(tenant.balance),
        status: stage === "SETTLED" ? "settled" : "active",
        isActive: stage !== "SETTLED",
        marshalScheduledDate: stage === "WARRANT" ? daysFromNow(randBetween(7, 30)) : null,
        createdAt: daysAgo(filedDaysAgo),
      },
    });

    // 2-3 legal notes per case
    const legalNoteTexts = [
      { text: "Petition filed with housing court. Serving tenant.", stage },
      { text: "Attorney appeared. Adjourned to next month for discovery.", stage },
      { text: "Tenant appeared pro se. Judge ordered mediation.", stage },
      { text: "Stipulation agreement reached. Tenant to pay $500/month.", stage: "STIPULATION" as const },
      { text: "Marshal eviction scheduled. 14-day notice served.", stage: "WARRANT" as const },
      { text: "Case settled — tenant paid in full. Case marked inactive.", stage: "SETTLED" as const },
    ];
    const noteCount = randBetween(2, 3);
    for (let n = 0; n < noteCount; n++) {
      const lnId = `seed-ln-${String(i).padStart(3, "0")}-${n}`;
      const noteTmpl = legalNoteTexts[n % legalNoteTexts.length];
      await prisma.legalNote.upsert({
        where: { id: lnId },
        update: {},
        create: {
          id: lnId,
          legalCaseId: lcId,
          authorId: adminId,
          text: noteTmpl.text,
          stage: noteTmpl.stage || stage,
          isSystem: n === 0, // first note is system-generated
          createdAt: daysAgo(randBetween(1, filedDaysAgo)),
        },
      });
    }
    legalCount++;
  }
  console.log(`✓ ${legalCount} legal cases upserted with notes`);

  // ── 8. AR SNAPSHOTS (6 months × tenants with balance) ──
  console.log("\n── Seeding AR Snapshots ──");
  const snapshotTenants = tenantsWithBalance.slice(0, 50); // top 50 by balance
  let snapCount = 0;
  for (const tenant of snapshotTenants) {
    const bldgId = unitBuildingMap.get(tenant.unitId)!;
    const currentBal = Number(tenant.balance);

    for (let m = 0; m < 6; m++) {
      const snapId = `seed-snap-${tenant.id.slice(-6)}-${m}`;
      const month = monthStart(m);

      // Simulate a story: some improving, some worsening
      const trend = tenant.id.charCodeAt(5) % 3; // 0=worsening, 1=stable, 2=improving
      let balMultiplier: number;
      if (trend === 0) balMultiplier = 1 - m * 0.08; // worsening (was lower before)
      else if (trend === 2) balMultiplier = 1 + m * 0.06; // improving (was higher before)
      else balMultiplier = 1 + (Math.random() - 0.5) * 0.1; // stable with noise

      const totalBal = Math.max(0, Math.round(currentBal * balMultiplier));
      const b90plus = Math.round(totalBal * 0.4);
      const b6190 = Math.round(totalBal * 0.25);
      const b3160 = Math.round(totalBal * 0.2);
      const b030 = totalBal - b90plus - b6190 - b3160;

      const collStatus = totalBal > 15000 ? "CHRONIC" : totalBal > 5000 ? "DELINQUENT" : totalBal > 2000 ? "LATE" : "CURRENT";

      await prisma.aRSnapshot.upsert({
        where: { tenantId_month: { tenantId: tenant.id, month } },
        update: {},
        create: {
          id: snapId,
          tenantId: tenant.id,
          buildingId: bldgId,
          month,
          balance0_30: b030,
          balance31_60: b3160,
          balance61_90: b6190,
          balance90plus: b90plus,
          totalBalance: totalBal,
          collectionStatus: collStatus as any,
          snapshotDate: month,
        },
      });
      snapCount++;
    }
  }
  console.log(`✓ ${snapCount} AR snapshots upserted`);

  // ── 9. VIOLATIONS (skip if already seeded — we have 995) ──
  const violationCount = await prisma.violation.count();
  if (violationCount > 0) {
    console.log(`\n── Violations: ${violationCount} already exist, skipping ──`);
  }

  // ── 10. UTILITY checks — already have 1887 meters, skip ──
  const meterCount = await prisma.utilityMeter.count();
  if (meterCount > 0) {
    console.log(`── Utility meters: ${meterCount} already exist, skipping ──`);
  }

  // ── 11. DEMO USERS FOR ALL ROLES ──
  console.log("\n── Seeding demo users for all roles ──");

  // Ensure default org exists
  await prisma.organization.upsert({
    where: { id: "org_default" },
    update: {},
    create: { id: "org_default", name: "Default Organization", slug: "default", plan: "trial", isActive: true },
  });

  const demoPassword = await bcrypt.hash("Atlas2026!", 12);

  // Get building IDs for assignment
  const allBuildings = await prisma.building.findMany({
    where: { organizationId: "org_default" },
    select: { id: true },
    orderBy: { address: "asc" },
  });
  const buildingIds = allBuildings.map((b) => b.id);

  const demoUsers = [
    { id: "seed-user-superadmin", email: "superadmin@atlaspm.com", name: "Platform Admin", username: "superadmin", role: "SUPER_ADMIN" as const, managerId: null, buildings: [] as string[] },
    { id: "seed-user-accountadmin", email: "admin@atlaspm.com", name: "Account Admin", username: "accountadmin", role: "ACCOUNT_ADMIN" as const, managerId: null, buildings: [] as string[] },
    { id: "seed-user-pm", email: "pm@atlaspm.com", name: "Sarah Johnson (PM)", username: "pmjohnson", role: "PM" as const, managerId: null, buildings: buildingIds.slice(0, 40) },
    { id: "seed-user-apm", email: "apm@atlaspm.com", name: "Mike Chen (APM)", username: "apmchen", role: "APM" as const, managerId: "seed-user-pm", buildings: [] as string[] },
    { id: "seed-user-owner", email: "owner@atlaspm.com", name: "Robert Klein (Owner)", username: "ownerklein", role: "OWNER" as const, managerId: null, buildings: buildingIds.slice(0, 10) },
    { id: "seed-user-leasing", email: "leasing@atlaspm.com", name: "Jessica Rivera (Leasing)", username: "leasingrivera", role: "LEASING_SPECIALIST" as const, managerId: "seed-user-pm", buildings: [] as string[] },
    { id: "seed-user-broker", email: "broker@atlaspm.com", name: "David Park (Broker)", username: "brokerpark", role: "BROKER" as const, managerId: null, buildings: buildingIds.slice(0, 5) },
    { id: "seed-user-super", email: "super@atlaspm.com", name: "Tony Russo (Super)", username: "superrusso", role: "SUPER" as const, managerId: null, buildings: buildingIds.slice(0, 3) },
    { id: "seed-user-accounting", email: "accounting@atlaspm.com", name: "Linda Torres (Accounting)", username: "accountingtorres", role: "ACCOUNTING" as const, managerId: "seed-user-pm", buildings: [] as string[] },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { role: u.role, managerId: u.managerId, organizationId: "org_default" },
      create: {
        id: u.id,
        email: u.email,
        name: u.name,
        username: u.username,
        passwordHash: demoPassword,
        role: u.role,
        active: true,
        organizationId: "org_default",
        managerId: u.managerId,
      },
    });

    // Assign buildings
    if (u.buildings.length > 0) {
      // Clear existing assignments for this user
      await prisma.userProperty.deleteMany({ where: { userId: u.id } });
      await prisma.userProperty.createMany({
        data: u.buildings.map((bid) => ({ userId: u.id, buildingId: bid })),
        skipDuplicates: true,
      });
    }

    console.log(`  ✓ ${u.role.padEnd(20)} ${u.email.padEnd(30)} (${u.name})`);
  }

  console.log("\n┌──────────────────────────────────────────────────────┐");
  console.log("│  Demo User Credentials (all use password: Atlas2026!)│");
  console.log("├──────────────────────────────────────────────────────┤");
  for (const u of demoUsers) {
    console.log(`│  ${u.role.padEnd(20)} ${u.email.padEnd(30)} │`);
  }
  console.log("└──────────────────────────────────────────────────────┘");

  // ── 12. SIGNAL SCAN ──
  console.log("\n── Running Coeus signal scan ──");
  try {
    // Dynamic import to avoid TS path resolution issues in seed context
    const { runSignalScan } = await import("../src/lib/signals/engine");
    const result = await runSignalScan("manual", adminId);
    console.log(`✓ Signal scan complete: ${result.created} created, ${result.updated} updated, ${result.resolved} resolved`);
  } catch (err) {
    console.log("⚠ Signal scan skipped (import failed — run manually via API). Error:", (err as Error).message);
  }

  console.log("\n══════════════════════════════════════");
  console.log("  Seed complete!");
  console.log("══════════════════════════════════════");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
