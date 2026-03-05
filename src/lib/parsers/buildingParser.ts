// Building Data Parser — AtlasPM Template
// Maps exact template column headers to internal field keys.
// Template uses lowercase_snake_case headers.

import * as XLSX from "xlsx";

/** Borough code for BBL computation (1=Manhattan, 2=Bronx, 3=Brooklyn, 4=Queens, 5=Staten Island) */
const BOROUGH_CODES: Record<string, string> = {
  manhattan: "1",
  bronx: "2",
  brooklyn: "3",
  queens: "4",
  "staten island": "5",
};

/** Exact 1:1 mapping from template column headers → internal field keys */
const COLUMN_MAP: Record<string, string> = {
  building_id: "buildingId",
  building_name: "buildingName",
  address: "address",
  city: "city",
  state: "state",
  zip: "zip",
  borough: "borough",
  block: "block",
  lot: "lot",
  bbl: "bbl",
  bin: "bin",
  hpd_registration_id: "hpdRegistrationId",
  certificate_of_occupancy: "certificateOfOccupancy",
  portfolio: "portfolio",
  year_built: "yearBuilt",
  floors: "floors",
  units: "units",
  commercial_units: "commercialUnits",
  total_square_footage: "totalSquareFootage",
  building_class: "buildingClass",
  construction_type: "constructionType",
  rent_stabilized: "rentStabilized",
  landmark_status: "landmarkStatus",
  aep_status: "aepStatus",
  building_status: "buildingStatus",
  boiler_type: "boilerType",
  boiler_install_year: "boilerInstallYear",
  hot_water_type: "hotWaterType",
  gas_type: "gasType",
  elevator: "elevator",
  elevator_count: "elevatorCount",
  sprinkler_system: "sprinklerSystem",
  fire_alarm_system: "fireAlarmSystem",
  oil_tank: "oilTank",
  owner_name: "ownerName",
  management_company: "managementCompany",
  property_manager: "propertyManager",
  superintendent: "superintendent",
  last_inspection_date: "lastInspectionDate",
  notes: "notes",
};

export interface ParsedBuildingRow {
  rowIndex: number;

  // Identity
  buildingId: string;
  buildingName?: string;

  // Location
  address: string;
  city?: string;
  state?: string;
  zip: string;
  borough: string;
  block?: string;
  lot?: string;
  bbl?: string;
  bin?: string;
  hpdRegistrationId?: string;
  certificateOfOccupancy?: string;
  portfolio?: string;

  // Structure
  yearBuilt?: number;
  floors?: number;
  units: number;
  commercialUnits?: number;
  totalSquareFootage?: number;
  buildingClass?: string;
  constructionType?: string;

  // Designations
  rentStabilized?: boolean;
  landmarkStatus?: string;
  aepStatus?: string;
  buildingStatus?: string;

  // Systems
  boilerType?: string;
  boilerInstallYear?: number;
  hotWaterType?: string;
  gasType?: string;
  elevator?: boolean;
  elevatorCount?: number;
  sprinklerSystem?: boolean;
  fireAlarmSystem?: boolean;
  oilTank?: boolean;

  // People
  ownerName?: string;
  managementCompany?: string;
  propertyManager?: string;
  superintendent?: string;

  // Meta
  lastInspectionDate?: string;
  notes?: string;
}

export interface BuildingImportResult {
  format: "building-data";
  buildings: ParsedBuildingRow[];
  errors: string[];
}

// ── Helpers ──

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, "_");
}

function cellToString(val: any): string | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  return String(val).trim();
}

function cellToInt(val: any): number | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  const n = typeof val === "number" ? val : parseInt(String(val).replace(/[^0-9.-]/g, ""), 10);
  return isNaN(n) ? undefined : n;
}

function cellToBool(val: any): boolean | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "boolean") return val;
  const s = String(val).toLowerCase().trim();
  if (["true", "yes", "1", "y"].includes(s)) return true;
  if (["false", "no", "0", "n"].includes(s)) return false;
  return undefined;
}

function excelDateToString(val: any): string | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (s) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return s || undefined;
}

/**
 * Auto-compute BBL from borough + block + lot.
 * Format: borough_code(1) + zero_pad(block,5) + zero_pad(lot,4) = 10 digits
 */
function computeBbl(borough: string, block: string, lot: string): string | undefined {
  const code = BOROUGH_CODES[borough.toLowerCase().trim()];
  if (!code) return undefined;
  const b = block.replace(/^0+/, "");
  const l = lot.replace(/^0+/, "");
  if (!b || !l) return undefined;
  return `${code}${b.padStart(5, "0")}${l.padStart(4, "0")}`;
}

// ── Parser ──

export function parseBuildingDataExcel(buffer: Buffer): BuildingImportResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (raw.length < 2) {
    return { format: "building-data", buildings: [], errors: ["File has no data rows"] };
  }

  // Find header row (first row containing "address" column)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    if (raw[i].some((c: any) => normalizeHeader(String(c)) === "address")) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = raw[headerRowIdx].map((h: any) => normalizeHeader(String(h)));

  // Build column index → field key mapping
  const colMap: Record<number, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const mapped = COLUMN_MAP[headers[i]];
    if (mapped) colMap[i] = mapped;
  }

  const buildings: ParsedBuildingRow[] = [];
  const errors: string[] = [];

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.every((c: any) => c === "" || c === null || c === undefined)) continue;

    const m: Record<string, any> = {};
    for (const [colIdx, fieldKey] of Object.entries(colMap)) {
      m[fieldKey] = row[Number(colIdx)];
    }

    const rowNum = r + 1;

    // Required field validation
    const address = cellToString(m.address);
    const buildingId = cellToString(m.buildingId);
    const zip = cellToString(m.zip);
    const borough = cellToString(m.borough);
    const units = cellToInt(m.units);

    const missing: string[] = [];
    if (!buildingId) missing.push("building_id");
    if (!address) missing.push("address");
    if (!zip) missing.push("zip");
    if (!borough) missing.push("borough");
    if (units === undefined) missing.push("units");

    if (missing.length > 0) {
      errors.push(`Row ${rowNum}: Missing required field(s): ${missing.join(", ")}`);
      continue;
    }

    // Auto-compute BBL if not provided
    let bbl = cellToString(m.bbl);
    const block = cellToString(m.block);
    const lot = cellToString(m.lot);
    if (!bbl && borough && block && lot) {
      bbl = computeBbl(borough, block, lot);
    }

    const building: ParsedBuildingRow = {
      rowIndex: rowNum,
      buildingId: buildingId!,
      buildingName: cellToString(m.buildingName),
      address: address!,
      city: cellToString(m.city) || "New York",
      state: cellToString(m.state) || "NY",
      zip: zip!,
      borough: borough!,
      block,
      lot,
      bbl,
      bin: cellToString(m.bin),
      hpdRegistrationId: cellToString(m.hpdRegistrationId),
      certificateOfOccupancy: cellToString(m.certificateOfOccupancy),
      portfolio: cellToString(m.portfolio),
      yearBuilt: cellToInt(m.yearBuilt),
      floors: cellToInt(m.floors),
      units: units!,
      commercialUnits: cellToInt(m.commercialUnits),
      totalSquareFootage: cellToInt(m.totalSquareFootage),
      buildingClass: cellToString(m.buildingClass),
      constructionType: cellToString(m.constructionType),
      rentStabilized: cellToBool(m.rentStabilized),
      landmarkStatus: cellToString(m.landmarkStatus),
      aepStatus: cellToString(m.aepStatus),
      buildingStatus: cellToString(m.buildingStatus),
      boilerType: cellToString(m.boilerType),
      boilerInstallYear: cellToInt(m.boilerInstallYear),
      hotWaterType: cellToString(m.hotWaterType),
      gasType: cellToString(m.gasType),
      elevator: cellToBool(m.elevator),
      elevatorCount: cellToInt(m.elevatorCount),
      sprinklerSystem: cellToBool(m.sprinklerSystem),
      fireAlarmSystem: cellToBool(m.fireAlarmSystem),
      oilTank: cellToBool(m.oilTank),
      ownerName: cellToString(m.ownerName),
      managementCompany: cellToString(m.managementCompany),
      propertyManager: cellToString(m.propertyManager),
      superintendent: cellToString(m.superintendent),
      lastInspectionDate: excelDateToString(m.lastInspectionDate),
      notes: cellToString(m.notes),
    };

    buildings.push(building);
  }

  return { format: "building-data", buildings, errors };
}

/** Convert a parsed building row to Prisma-compatible data for upsert */
export function buildingRowToPrismaData(row: ParsedBuildingRow) {
  const data: Record<string, any> = {
    address: row.address,
  };

  // Identity & Location
  if (row.buildingName) data.buildingName = row.buildingName;
  if (row.city) data.city = row.city;
  if (row.state) data.state = row.state;
  if (row.zip) data.zip = row.zip;
  if (row.borough) data.borough = row.borough;
  if (row.block) data.block = row.block;
  if (row.lot) data.lot = row.lot;
  if (row.bbl) data.bbl = row.bbl;
  if (row.bin) data.bin = row.bin;
  if (row.hpdRegistrationId) data.hpdRegistrationId = row.hpdRegistrationId;
  if (row.certificateOfOccupancy) data.certificateOfOccupancy = row.certificateOfOccupancy;
  if (row.portfolio) data.portfolio = row.portfolio;

  // Structure
  if (row.yearBuilt !== undefined) data.yearBuilt = row.yearBuilt;
  if (row.floors !== undefined) data.floors = row.floors;
  data.totalUnits = row.units;
  if (row.commercialUnits !== undefined) data.commercialUnits = row.commercialUnits;
  if (row.totalSquareFootage !== undefined) data.squareFootage = row.totalSquareFootage;
  if (row.buildingClass) data.buildingClass = row.buildingClass;
  if (row.constructionType) data.constructionType = row.constructionType;

  // Designations
  if (row.rentStabilized !== undefined) data.rentStabilized = row.rentStabilized;
  if (row.landmarkStatus) data.landmarkStatus = row.landmarkStatus;
  if (row.aepStatus) data.aepStatus = row.aepStatus;
  if (row.buildingStatus) data.buildingStatus = row.buildingStatus;

  // Systems — scalar fields
  if (row.boilerType) data.boilerType = row.boilerType;
  if (row.boilerInstallYear !== undefined) data.boilerInstallYear = row.boilerInstallYear;
  if (row.hotWaterType) data.hotWaterType = row.hotWaterType;
  if (row.gasType) data.gasType = row.gasType;
  if (row.elevator !== undefined) data.elevator = row.elevator;
  if (row.elevatorCount !== undefined) data.elevatorCount = row.elevatorCount;
  if (row.sprinklerSystem !== undefined) data.sprinklerSystem = row.sprinklerSystem;
  if (row.fireAlarmSystem !== undefined) data.fireAlarmSystem = row.fireAlarmSystem;
  if (row.oilTank !== undefined) data.oilTank = row.oilTank;

  // People
  if (row.ownerName) data.owner = row.ownerName;
  if (row.managementCompany) data.managementCompany = row.managementCompany;
  if (row.propertyManager) data.manager = row.propertyManager;
  if (row.superintendent) {
    data.superintendent = { name: row.superintendent };
  }

  // Meta
  if (row.lastInspectionDate) {
    const d = new Date(row.lastInspectionDate);
    if (!isNaN(d.getTime())) data.lastInspectionDate = d;
  }
  if (row.notes) data.notes = row.notes;

  // Also populate legacy JSON fields for backward compat
  const lifeSafety: Record<string, any> = {};
  if (row.sprinklerSystem !== undefined) lifeSafety.sprinkler = row.sprinklerSystem ? "Yes" : "No";
  if (row.fireAlarmSystem !== undefined) lifeSafety.fireAlarm = row.fireAlarmSystem ? "Yes" : "No";
  if (row.oilTank !== undefined) lifeSafety.petroleumBulkStorage = row.oilTank ? "Yes" : "No";
  if (Object.keys(lifeSafety).length > 0) data.lifeSafety = lifeSafety;

  const boilerInfo: Record<string, any> = {};
  if (row.boilerType) boilerInfo.type = row.boilerType;
  if (row.boilerInstallYear) boilerInfo.installYear = String(row.boilerInstallYear);
  if (Object.keys(boilerInfo).length > 0) data.boilerInfo = boilerInfo;

  const elevatorInfo: Record<string, any> = {};
  if (row.elevator !== undefined) elevatorInfo.hasElevator = row.elevator;
  if (row.elevatorCount !== undefined) elevatorInfo.count = row.elevatorCount;
  if (Object.keys(elevatorInfo).length > 0) data.elevatorInfo = elevatorInfo;

  return data;
}
