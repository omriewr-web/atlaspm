// Building Data Import Parser
// Parses Book1.xlsx-style building data files with property info, construction details,
// life safety systems, elevator, boiler, and compliance filing data.

import * as XLSX from "xlsx";

/** Column header aliases → internal field key */
const COLUMN_MAP: Record<string, string> = {
  // Property Info
  "portfolio": "portfolio",
  "property type": "type",
  "propertytype": "type",
  "bin # (dob)": "bin",
  "bin #": "bin",
  "bin": "bin",
  "mdr number": "mdrNumber",
  "mdr": "mdrNumber",
  "dhcr registration id": "dhcrRegId",
  "dhcr reg id": "dhcrRegId",
  "dhcr id": "dhcrRegId",
  "yardi code": "yardiId",
  "yardicode": "yardiId",
  "yardi id": "yardiId",
  "entity": "entity",
  "address": "address",
  "region": "region",
  "zip code": "zip",
  "zipcode": "zip",
  "zip": "zip",
  "block": "block",
  "lot": "lot",
  "unit count": "totalUnits",
  "unitcount": "totalUnits",
  "units": "totalUnits",
  "property manager": "manager",
  "propertymanager": "manager",
  "manager": "manager",
  "management start date": "mgmtStartDate",
  "mgmt start date": "mgmtStartDate",
  "ein number": "einNumber",
  "ein": "einNumber",
  "owner": "owner",
  "owner email address": "ownerEmail",
  "owner email": "ownerEmail",

  // Construction Details
  "building square footage": "squareFootage",
  "square footage": "squareFootage",
  "sqft": "squareFootage",
  "year of construction": "yearBuilt",
  "year built": "yearBuilt",
  "yearbuilt": "yearBuilt",
  "type of construction": "constructionType",
  "construction type": "constructionType",
  "number of floors": "floors",
  "floors": "floors",
  "stories": "floors",
  "floors belowground": "floorsBelowGround",
  "floors below ground": "floorsBelowGround",
  "below ground floors": "floorsBelowGround",
  "basement levels": "floorsBelowGround",

  // Life Safety Systems
  "sprinkler system": "sprinkler",
  "sprinkler": "sprinkler",
  "sprinkler system coverage": "sprinklerCoverage",
  "sprinkler coverage": "sprinklerCoverage",
  "fire alarm": "fireAlarm",
  "firealarm": "fireAlarm",
  "means of egress": "egress",
  "egress": "egress",
  "backflow": "backflow",
  "standpipe": "standpipe",
  "cooling tower": "coolingTower",
  "coolingtower": "coolingTower",
  "water storage tank": "waterStorageTank",
  "waterstoragetank": "waterStorageTank",
  "petroleum bulk storage (oil tank)": "petroleumBulkStorage",
  "petroleum bulk storage": "petroleumBulkStorage",
  "oil tank": "petroleumBulkStorage",

  // Elevator Info
  "elevator type": "elevatorType",
  "elevator": "elevatorType",
  "cat 1 date": "cat1Date",
  "cat 1": "cat1Date",
  "cat1": "cat1Date",
  "cat1 date": "cat1Date",
  "cat 5 date": "cat5Date",
  "cat 5": "cat5Date",
  "cat5": "cat5Date",
  "cat5 date": "cat5Date",
  "elevator follow up & notes": "elevatorNotes",
  "elevator follow up": "elevatorNotes",
  "elevator notes": "elevatorNotes",
  "elevator followup & notes": "elevatorNotes",
  "elevator aoc submitted": "elevatorAoc",
  "aoc submitted": "elevatorAoc",
  "elevator aoc": "elevatorAoc",

  // Boiler Info
  "last annual boiler inspection": "boilerInspection",
  "boiler inspection": "boilerInspection",
  "boiler inspection date": "boilerInspection",
  "boiler device": "boilerDevice",
  "boiler": "boilerDevice",
  "annual boiler follow up & notes": "boilerNotes",
  "boiler follow up & notes": "boilerNotes",
  "boiler notes": "boilerNotes",
  "boiler followup & notes": "boilerNotes",

  // Compliance Filing Dates
  "ll152 gas pipe status": "ll152GasPipe",
  "ll152 gas pipe": "ll152GasPipe",
  "ll152": "ll152GasPipe",
  "parapet inspection": "parapetInspection",
  "parapet": "parapetInspection",
  "hpd registration year": "hpdRegistrationYear",
  "hpd registration": "hpdRegistrationYear",
  "hpd reg year": "hpdRegistrationYear",
  "annual bed bug filing year": "bedBugFilingYear",
  "annual bed bug filing": "bedBugFilingYear",
  "bed bug filing": "bedBugFilingYear",
  "bed bug filing year": "bedBugFilingYear",
  "bedbug filing": "bedBugFilingYear",
  "annual safety filing year": "safetyFilingYear",
  "annual safety filing": "safetyFilingYear",
  "safety filing": "safetyFilingYear",
  "safety filing year": "safetyFilingYear",
};

// Keys that identify this as a building data file (not a rent roll)
const BUILDING_DATA_SIGNATURES = [
  "bin", "bin # (dob)", "mdr number", "dhcr registration id",
  "sprinkler system", "fire alarm", "elevator type", "boiler device",
  "cat 1 date", "cat 5 date", "means of egress", "standpipe",
  "ll152 gas pipe", "parapet inspection", "hpd registration",
  "building square footage", "year of construction", "type of construction",
  "cooling tower", "petroleum bulk storage",
];

export interface ParsedBuildingRow {
  // Parsed from Excel
  rowIndex: number;
  address: string;
  block?: string;
  lot?: string;
  yardiId?: string;
  portfolio?: string;
  type?: string;
  bin?: string;
  mdrNumber?: string;
  dhcrRegId?: string;
  entity?: string;
  region?: string;
  zip?: string;
  totalUnits?: number;
  manager?: string;
  mgmtStartDate?: string;
  einNumber?: string;
  owner?: string;
  ownerEmail?: string;

  // Construction
  squareFootage?: number;
  yearBuilt?: number;
  constructionType?: string;
  floors?: number;
  floorsBelowGround?: number;

  // Life Safety (grouped into JSON)
  sprinkler?: string;
  sprinklerCoverage?: string;
  fireAlarm?: string;
  egress?: string;
  backflow?: string;
  standpipe?: string;
  coolingTower?: string;
  waterStorageTank?: string;
  petroleumBulkStorage?: string;

  // Elevator (grouped into JSON)
  elevatorType?: string;
  cat1Date?: string;
  cat5Date?: string;
  elevatorNotes?: string;
  elevatorAoc?: string;

  // Boiler (grouped into JSON)
  boilerInspection?: string;
  boilerDevice?: string;
  boilerNotes?: string;

  // Compliance Dates (grouped into JSON)
  ll152GasPipe?: string;
  parapetInspection?: string;
  hpdRegistrationYear?: string;
  bedBugFilingYear?: string;
  safetyFilingYear?: string;
}

export interface BuildingImportResult {
  format: "building-data";
  buildings: ParsedBuildingRow[];
  errors: string[];
}

/** Detect if the given Excel headers indicate a building data file */
export function isBuildingDataFile(headers: string[]): boolean {
  const normalized = headers.map((h) => h.toLowerCase().trim());
  const matchCount = BUILDING_DATA_SIGNATURES.filter((sig) =>
    normalized.some((h) => h.includes(sig))
  ).length;
  // If 3+ signature columns present, it's building data
  return matchCount >= 3;
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[#()&]/g, "").replace(/\s+/g, " ").trim();
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

function excelDateToString(val: any): string | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  // Excel serial date number
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  // Try parsing as date string
  if (s) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  // Return as-is if it could be a year or status string (e.g. "2024", "Compliant")
  return s || undefined;
}

export function parseBuildingDataExcel(buffer: Buffer): BuildingImportResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (raw.length < 2) {
    return { format: "building-data", buildings: [], errors: ["File has no data rows"] };
  }

  // Find header row (first row with "Address" column)
  let headerRowIdx = 0;
  for (let i = 0; i < Math.min(5, raw.length); i++) {
    const row = raw[i];
    if (row.some((c: any) => String(c).toLowerCase().trim() === "address")) {
      headerRowIdx = i;
      break;
    }
  }

  const headers = raw[headerRowIdx].map((h: any) => String(h));
  const normalizedHeaders = headers.map(normalizeHeader);

  // Build column index → field key mapping
  const colMap: Record<number, string> = {};
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const nh = normalizedHeaders[i];
    if (COLUMN_MAP[nh]) {
      colMap[i] = COLUMN_MAP[nh];
    } else {
      // Try partial matching
      for (const [alias, key] of Object.entries(COLUMN_MAP)) {
        if (nh.includes(alias) || alias.includes(nh)) {
          colMap[i] = key;
          break;
        }
      }
    }
  }

  const buildings: ParsedBuildingRow[] = [];
  const errors: string[] = [];

  for (let r = headerRowIdx + 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row || row.every((c: any) => c === "" || c === null || c === undefined)) continue;

    const mapped: Record<string, any> = {};
    for (const [colIdx, fieldKey] of Object.entries(colMap)) {
      mapped[fieldKey] = row[Number(colIdx)];
    }

    // Must have address
    const address = cellToString(mapped.address);
    if (!address) {
      errors.push(`Row ${r + 1}: Missing address, skipped`);
      continue;
    }

    const building: ParsedBuildingRow = {
      rowIndex: r + 1,
      address,
      block: cellToString(mapped.block),
      lot: cellToString(mapped.lot),
      yardiId: cellToString(mapped.yardiId),
      portfolio: cellToString(mapped.portfolio),
      type: cellToString(mapped.type),
      bin: cellToString(mapped.bin),
      mdrNumber: cellToString(mapped.mdrNumber),
      dhcrRegId: cellToString(mapped.dhcrRegId),
      entity: cellToString(mapped.entity),
      region: cellToString(mapped.region),
      zip: cellToString(mapped.zip),
      totalUnits: cellToInt(mapped.totalUnits),
      manager: cellToString(mapped.manager),
      mgmtStartDate: excelDateToString(mapped.mgmtStartDate),
      einNumber: cellToString(mapped.einNumber),
      owner: cellToString(mapped.owner),
      ownerEmail: cellToString(mapped.ownerEmail),
      squareFootage: cellToInt(mapped.squareFootage),
      yearBuilt: cellToInt(mapped.yearBuilt),
      constructionType: cellToString(mapped.constructionType),
      floors: cellToInt(mapped.floors),
      floorsBelowGround: cellToInt(mapped.floorsBelowGround),
      sprinkler: cellToString(mapped.sprinkler),
      sprinklerCoverage: cellToString(mapped.sprinklerCoverage),
      fireAlarm: cellToString(mapped.fireAlarm),
      egress: cellToString(mapped.egress),
      backflow: cellToString(mapped.backflow),
      standpipe: cellToString(mapped.standpipe),
      coolingTower: cellToString(mapped.coolingTower),
      waterStorageTank: cellToString(mapped.waterStorageTank),
      petroleumBulkStorage: cellToString(mapped.petroleumBulkStorage),
      elevatorType: cellToString(mapped.elevatorType),
      cat1Date: excelDateToString(mapped.cat1Date),
      cat5Date: excelDateToString(mapped.cat5Date),
      elevatorNotes: cellToString(mapped.elevatorNotes),
      elevatorAoc: cellToString(mapped.elevatorAoc),
      boilerInspection: excelDateToString(mapped.boilerInspection),
      boilerDevice: cellToString(mapped.boilerDevice),
      boilerNotes: cellToString(mapped.boilerNotes),
      ll152GasPipe: cellToString(mapped.ll152GasPipe),
      parapetInspection: excelDateToString(mapped.parapetInspection),
      hpdRegistrationYear: cellToString(mapped.hpdRegistrationYear),
      bedBugFilingYear: cellToString(mapped.bedBugFilingYear),
      safetyFilingYear: cellToString(mapped.safetyFilingYear),
    };

    buildings.push(building);
  }

  return { format: "building-data", buildings, errors };
}

/** Convert a parsed building row to Prisma-compatible data for upsert */
export function buildingRowToPrismaData(row: ParsedBuildingRow) {
  const lifeSafety: Record<string, string> = {};
  if (row.sprinkler) lifeSafety.sprinkler = row.sprinkler;
  if (row.sprinklerCoverage) lifeSafety.sprinklerCoverage = row.sprinklerCoverage;
  if (row.fireAlarm) lifeSafety.fireAlarm = row.fireAlarm;
  if (row.egress) lifeSafety.egress = row.egress;
  if (row.backflow) lifeSafety.backflow = row.backflow;
  if (row.standpipe) lifeSafety.standpipe = row.standpipe;
  if (row.coolingTower) lifeSafety.coolingTower = row.coolingTower;
  if (row.waterStorageTank) lifeSafety.waterStorageTank = row.waterStorageTank;
  if (row.petroleumBulkStorage) lifeSafety.petroleumBulkStorage = row.petroleumBulkStorage;

  const elevatorInfo: Record<string, string> = {};
  if (row.elevatorType) elevatorInfo.type = row.elevatorType;
  if (row.cat1Date) elevatorInfo.cat1Date = row.cat1Date;
  if (row.cat5Date) elevatorInfo.cat5Date = row.cat5Date;
  if (row.elevatorNotes) elevatorInfo.followUpNotes = row.elevatorNotes;
  if (row.elevatorAoc) elevatorInfo.aocSubmitted = row.elevatorAoc;

  const boilerInfo: Record<string, string> = {};
  if (row.boilerInspection) boilerInfo.lastInspectionDate = row.boilerInspection;
  if (row.boilerDevice) boilerInfo.device = row.boilerDevice;
  if (row.boilerNotes) boilerInfo.followUpNotes = row.boilerNotes;

  const complianceDates: Record<string, string> = {};
  if (row.ll152GasPipe) complianceDates.ll152GasPipe = row.ll152GasPipe;
  if (row.parapetInspection) complianceDates.parapetInspection = row.parapetInspection;
  if (row.hpdRegistrationYear) complianceDates.hpdRegistrationYear = row.hpdRegistrationYear;
  if (row.bedBugFilingYear) complianceDates.bedBugFilingYear = row.bedBugFilingYear;
  if (row.safetyFilingYear) complianceDates.safetyFilingYear = row.safetyFilingYear;

  const data: Record<string, any> = {
    address: row.address,
  };

  // Only set non-null fields
  if (row.portfolio) data.portfolio = row.portfolio;
  if (row.type) data.type = row.type;
  if (row.bin) data.bin = row.bin;
  if (row.mdrNumber) data.mdrNumber = row.mdrNumber;
  if (row.dhcrRegId) data.dhcrRegId = row.dhcrRegId;
  if (row.entity) data.entity = row.entity;
  if (row.region) data.region = row.region;
  if (row.zip) data.zip = row.zip;
  if (row.block) data.block = row.block;
  if (row.lot) data.lot = row.lot;
  if (row.totalUnits !== undefined) data.totalUnits = row.totalUnits;
  if (row.manager) data.manager = row.manager;
  if (row.mgmtStartDate) {
    const d = new Date(row.mgmtStartDate);
    if (!isNaN(d.getTime())) data.mgmtStartDate = d;
  }
  if (row.einNumber) data.einNumber = row.einNumber;
  if (row.owner) data.owner = row.owner;
  if (row.ownerEmail) data.ownerEmail = row.ownerEmail;
  if (row.squareFootage !== undefined) data.squareFootage = row.squareFootage;
  if (row.yearBuilt !== undefined) data.yearBuilt = row.yearBuilt;
  if (row.constructionType) data.constructionType = row.constructionType;
  if (row.floors !== undefined) data.floors = row.floors;
  if (row.floorsBelowGround !== undefined) data.floorsBelowGround = row.floorsBelowGround;
  if (Object.keys(lifeSafety).length > 0) data.lifeSafety = lifeSafety;
  if (Object.keys(elevatorInfo).length > 0) data.elevatorInfo = elevatorInfo;
  if (Object.keys(boilerInfo).length > 0) data.boilerInfo = boilerInfo;
  if (Object.keys(complianceDates).length > 0) data.complianceDates = complianceDates;

  return data;
}
