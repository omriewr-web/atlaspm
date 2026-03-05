import type { ComplianceCategory, ComplianceFrequency } from "@/types";

interface ComplianceTemplate {
  type: string;
  category: ComplianceCategory;
  name: string;
  description: string;
  frequency: ComplianceFrequency;
  defaultDueMonth?: number; // 1-12
  defaultDueDay?: number;
}

export const DEFAULT_COMPLIANCE_TEMPLATES: ComplianceTemplate[] = [
  // ── Local Laws (10) ──────────────────────────────────────
  { type: "LL11_FISP", category: "LOCAL_LAW", name: "LL11/FISP Facade Inspection", description: "Facade Inspection & Safety Program — exterior wall inspection and filing", frequency: "FIVE_YEAR" },
  { type: "LL152_GAS", category: "LOCAL_LAW", name: "LL152 Gas Piping Inspection", description: "Periodic inspection of gas piping systems by a licensed master plumber", frequency: "FOUR_YEAR" },
  { type: "LL97_EMISSIONS", category: "LOCAL_LAW", name: "LL97 Carbon Emissions", description: "Annual emissions report for buildings over 25,000 sq ft", frequency: "ANNUAL", defaultDueMonth: 5, defaultDueDay: 1 },
  { type: "LL55_CRANE", category: "LOCAL_LAW", name: "LL55 Construction Safety", description: "Site safety manager/coordinator requirements for major construction", frequency: "ONE_TIME" },
  { type: "LL26_CAT1", category: "LOCAL_LAW", name: "LL26 Elevator CAT1 Test", description: "Annual Category 1 elevator safety test", frequency: "ANNUAL" },
  { type: "LL26_CAT5", category: "LOCAL_LAW", name: "LL26 Elevator CAT5 Test", description: "Five-year Category 5 full-load elevator safety test", frequency: "FIVE_YEAR" },
  { type: "LL31_GAS_DETECTOR", category: "LOCAL_LAW", name: "LL31 Natural Gas Detector", description: "Install and maintain natural gas detectors in buildings with gas service", frequency: "ANNUAL" },
  { type: "LL126_CO_DETECTOR", category: "LOCAL_LAW", name: "LL126 CO Detectors", description: "Carbon monoxide detector installation and maintenance compliance", frequency: "ANNUAL" },
  { type: "LL1_LEAD_PAINT", category: "LOCAL_LAW", name: "LL1 Lead Paint", description: "Lead-based paint hazard inspection and remediation for pre-1960 buildings", frequency: "ANNUAL" },
  { type: "LL196_LIGHTING", category: "LOCAL_LAW", name: "LL196 Lighting Upgrades", description: "Energy efficiency lighting upgrade requirements", frequency: "ONE_TIME" },

  // ── Inspections (11) ──────────────────────────────────────
  { type: "ELEVATOR_CAT1", category: "INSPECTION", name: "Elevator CAT1 Annual", description: "Annual Category 1 elevator inspection by authorized agency", frequency: "ANNUAL" },
  { type: "ELEVATOR_CAT5", category: "INSPECTION", name: "Elevator CAT5 Five-Year", description: "Five-year Category 5 full-load elevator test", frequency: "FIVE_YEAR" },
  { type: "BOILER_INSPECTION", category: "INSPECTION", name: "Boiler Inspection", description: "Annual boiler inspection and filing with DOB", frequency: "ANNUAL" },
  { type: "FIRE_ALARM", category: "INSPECTION", name: "Fire Alarm Inspection", description: "Annual fire alarm system inspection and test", frequency: "ANNUAL" },
  { type: "SPRINKLER", category: "INSPECTION", name: "Sprinkler System Inspection", description: "Annual sprinkler system inspection and certification", frequency: "ANNUAL" },
  { type: "STANDPIPE", category: "INSPECTION", name: "Standpipe Inspection", description: "Annual standpipe system flow test and inspection", frequency: "ANNUAL" },
  { type: "FIRE_ESCAPE", category: "INSPECTION", name: "Fire Escape Inspection", description: "Five-year fire escape load test and visual inspection", frequency: "FIVE_YEAR" },
  { type: "BACKFLOW", category: "INSPECTION", name: "Backflow Prevention Test", description: "Annual backflow preventer testing and DEP filing", frequency: "ANNUAL" },
  { type: "KITCHEN_HOOD", category: "INSPECTION", name: "Kitchen Hood Cleaning", description: "Semi-annual commercial kitchen hood and duct cleaning", frequency: "SEMI_ANNUAL" },
  { type: "EMERGENCY_LIGHTING", category: "INSPECTION", name: "Emergency Lighting Test", description: "Annual emergency and exit lighting inspection", frequency: "ANNUAL" },
  { type: "FDNY_COF", category: "INSPECTION", name: "FDNY Certificate of Fitness", description: "FDNY Certificate of Fitness renewal for building staff", frequency: "ANNUAL" },

  // ── Filings (10) ──────────────────────────────────────────
  { type: "DHCR_RENT_REG", category: "FILING", name: "DHCR Rent Registration", description: "Annual rent registration filing with DHCR for rent-stabilized units", frequency: "ANNUAL" },
  { type: "BEDBUG_REPORT", category: "FILING", name: "Bedbug Reporting", description: "Annual bedbug infestation history filing with HPD", frequency: "ANNUAL" },
  { type: "WINDOW_GUARD", category: "FILING", name: "Window Guard Compliance", description: "Annual window guard inspection notice and compliance filing", frequency: "ANNUAL" },
  { type: "HPD_SAFETY_MAILING", category: "FILING", name: "HPD Annual Safety Mailing", description: "Required annual safety notice mailing to all tenants", frequency: "ANNUAL" },
  { type: "LL84_BENCHMARKING", category: "FILING", name: "LL84/LL97 Benchmarking", description: "Annual energy and water benchmarking report filing", frequency: "ANNUAL", defaultDueMonth: 5, defaultDueDay: 1 },
  { type: "RPIE_DOF", category: "FILING", name: "RPIE Filing (DOF)", description: "Real Property Income & Expense filing with Department of Finance", frequency: "ANNUAL" },
  { type: "HPD_PROPERTY_REG", category: "FILING", name: "HPD Property Registration", description: "Annual property registration with HPD including emergency contacts", frequency: "ANNUAL" },
  { type: "SMOKE_CO_AFFIDAVIT", category: "FILING", name: "Smoke/CO Detector Affidavit", description: "Annual affidavit confirming smoke and CO detector compliance", frequency: "ANNUAL" },
  { type: "LEAD_PAINT_DISCLOSURE", category: "FILING", name: "Lead Paint Disclosure", description: "Lead paint disclosure to tenants upon lease signing (pre-1978 buildings)", frequency: "ON_EVENT" },
  { type: "LL54_STOVE_KNOB", category: "FILING", name: "LL54 Stove Knob Covers", description: "Stove knob cover provision for households with children under 6", frequency: "ANNUAL" },
];

export function calculateNextDueDate(
  frequency: ComplianceFrequency,
  fromDate?: Date,
  defaultDueMonth?: number,
  defaultDueDay?: number
): Date {
  const base = fromDate || new Date();
  const result = new Date(base);

  switch (frequency) {
    case "ANNUAL":
      result.setFullYear(result.getFullYear() + 1);
      break;
    case "SEMI_ANNUAL":
      result.setMonth(result.getMonth() + 6);
      break;
    case "QUARTERLY":
      result.setMonth(result.getMonth() + 3);
      break;
    case "FIVE_YEAR":
      result.setFullYear(result.getFullYear() + 5);
      break;
    case "FOUR_YEAR":
      result.setFullYear(result.getFullYear() + 4);
      break;
    case "ONE_TIME":
    case "ON_EVENT":
      // No automatic next date
      return result;
  }

  if (defaultDueMonth) {
    result.setMonth(defaultDueMonth - 1);
    result.setDate(defaultDueDay || 1);
    // If the computed date is in the past, add one cycle
    if (result < new Date()) {
      switch (frequency) {
        case "ANNUAL": result.setFullYear(result.getFullYear() + 1); break;
        case "FIVE_YEAR": result.setFullYear(result.getFullYear() + 5); break;
        case "FOUR_YEAR": result.setFullYear(result.getFullYear() + 4); break;
      }
    }
  }

  return result;
}

export function generateDefaultComplianceItems(buildingId: string) {
  return DEFAULT_COMPLIANCE_TEMPLATES.map((t) => ({
    buildingId,
    type: t.type,
    category: t.category,
    name: t.name,
    description: t.description,
    frequency: t.frequency,
    status: "PENDING" as const,
    nextDueDate: calculateNextDueDate(t.frequency, undefined, t.defaultDueMonth, t.defaultDueDay),
    isCustom: false,
  }));
}
