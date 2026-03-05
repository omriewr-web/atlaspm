// NYC Open Data (Socrata) integration for violation fetching

const SOCRATA_BASE = "https://data.cityofnewyork.us/resource";

export const ENDPOINTS: Record<string, string> = {
  HPD: "wvxf-dwi5",
  DOB: "3h2n-5cm9",
  ECB: "6bgk-3dad",
  HPD_COMPLAINTS: "uwyv-629c",
};

export const BORO_MAP: Record<string, string> = {
  MANHATTAN: "1",
  "NEW YORK": "1",
  BRONX: "2",
  BROOKLYN: "3",
  QUEENS: "4",
  "STATEN ISLAND": "5",
};

const ZIP_BORO: Record<string, string> = {
  // Manhattan
  "100": "1", "101": "1", "102": "1",
  // Bronx
  "104": "2",
  // Brooklyn
  "112": "3",
  // Queens
  "110": "4", "111": "4", "113": "4", "114": "4", "116": "4",
  // Staten Island
  "103": "5",
};

export function detectBoroId(address: string, zip?: string | null): string | null {
  const upper = address.toUpperCase();
  for (const [name, id] of Object.entries(BORO_MAP)) {
    if (upper.includes(name)) return id;
  }
  if (zip) {
    const prefix = zip.substring(0, 3);
    if (ZIP_BORO[prefix]) return ZIP_BORO[prefix];
  }
  return null;
}

async function socrataFetch(endpoint: string, where: string, limit = 10000): Promise<any[]> {
  const url = `${SOCRATA_BASE}/${endpoint}.json?$where=${encodeURIComponent(where)}&$limit=${limit}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  const appToken = process.env.NYC_OPEN_DATA_APP_TOKEN;
  if (appToken) headers["X-App-Token"] = appToken;

  const res = await fetch(url, { headers, next: { revalidate: 3600 } });
  if (!res.ok) {
    console.error(`Socrata fetch failed: ${res.status} ${res.statusText} for ${endpoint}`);
    return [];
  }
  return res.json();
}

export async function fetchHpdViolations(block: string, lot: string, boroId: string) {
  const where = `boroid='${boroId}' AND block='${block.padStart(5, "0")}' AND lot='${lot.padStart(4, "0")}'`;
  return socrataFetch(ENDPOINTS.HPD, where);
}

export async function fetchDobViolations(block: string, lot: string, boroId: string) {
  const where = `boro='${boroId}' AND block='${block.padStart(5, "0")}' AND lot='${lot.padStart(4, "0")}'`;
  return socrataFetch(ENDPOINTS.DOB, where);
}

export async function fetchEcbViolations(block: string, lot: string, boroId: string) {
  const where = `violation_block='${block.padStart(5, "0")}' AND violation_lot='${lot.padStart(4, "0")}' AND boro='${boroId}'`;
  return socrataFetch(ENDPOINTS.ECB, where);
}

export async function fetchHpdComplaints(block: string, lot: string, boroId: string) {
  const where = `boroid='${boroId}' AND block='${block.padStart(5, "0")}' AND lot='${lot.padStart(4, "0")}'`;
  return socrataFetch(ENDPOINTS.HPD_COMPLAINTS, where);
}

function parseDate(val: string | undefined | null): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

function parseDecimal(val: string | number | undefined | null): number {
  if (val == null) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

function mapHpdClass(cls: string | undefined): "A" | "B" | "C" | null {
  if (!cls) return null;
  const upper = cls.toUpperCase();
  if (upper === "A" || upper === "B" || upper === "C") return upper;
  return null;
}

function hpdSeverity(cls: string | undefined): "IMMEDIATELY_HAZARDOUS" | "HAZARDOUS" | "NON_HAZARDOUS" | null {
  if (!cls) return null;
  const upper = cls.toUpperCase();
  if (upper === "C") return "IMMEDIATELY_HAZARDOUS";
  if (upper === "B") return "HAZARDOUS";
  if (upper === "A") return "NON_HAZARDOUS";
  return null;
}

export function mapHpdViolation(row: any, buildingId: string) {
  return {
    where: { source_externalId: { source: "HPD" as const, externalId: String(row.violationid || row.violation_id || row.violationid || "") } },
    create: {
      buildingId,
      source: "HPD" as const,
      externalId: String(row.violationid || row.violation_id || ""),
      class: mapHpdClass(row.class),
      severity: hpdSeverity(row.class),
      description: row.novdescription || row.violationstatus || "HPD Violation",
      inspectionDate: parseDate(row.inspectiondate),
      issuedDate: parseDate(row.novissueddate),
      currentStatus: row.violationstatus || row.currentstatus || null,
      penaltyAmount: parseDecimal(row.penalityamount),
      respondByDate: parseDate(row.currentstatusdate),
      certifiedDismissDate: parseDate(row.certifieddate),
      correctionDate: parseDate(row.approveddate),
      unitNumber: row.apartment || null,
      novDescription: row.novdescription || null,
    },
    update: {
      currentStatus: row.violationstatus || row.currentstatus || null,
      penaltyAmount: parseDecimal(row.penalityamount),
      certifiedDismissDate: parseDate(row.certifieddate),
      correctionDate: parseDate(row.approveddate),
    },
  };
}

export function mapDobViolation(row: any, buildingId: string) {
  return {
    where: { source_externalId: { source: "DOB" as const, externalId: String(row.isn_dob_bis_viol || row.violation_number || "") } },
    create: {
      buildingId,
      source: "DOB" as const,
      externalId: String(row.isn_dob_bis_viol || row.violation_number || ""),
      class: null,
      severity: null,
      description: row.violation_type || row.description || "DOB Violation",
      inspectionDate: parseDate(row.inspection_date),
      issuedDate: parseDate(row.issue_date),
      currentStatus: row.violation_type_code || row.disposition_comments || null,
      penaltyAmount: parseDecimal(row.penalty_balance_due || row.amount_paid),
      respondByDate: parseDate(row.disposition_date),
      unitNumber: null,
      novDescription: row.description || null,
    },
    update: {
      currentStatus: row.violation_type_code || row.disposition_comments || null,
      penaltyAmount: parseDecimal(row.penalty_balance_due || row.amount_paid),
    },
  };
}

export function mapEcbViolation(row: any, buildingId: string) {
  return {
    where: { source_externalId: { source: "ECB" as const, externalId: String(row.isn_dob_bis_viol || row.ecb_violation_number || "") } },
    create: {
      buildingId,
      source: "ECB" as const,
      externalId: String(row.isn_dob_bis_viol || row.ecb_violation_number || ""),
      class: null,
      severity: null,
      description: row.violation_description || row.violation_type || "ECB Violation",
      issuedDate: parseDate(row.issue_date),
      currentStatus: row.ecb_violation_status || row.violation_status || null,
      penaltyAmount: parseDecimal(row.penalty_balance_due || row.penalty_applied || row.amount_paid),
      respondByDate: parseDate(row.hearing_date_time),
      hearingDate: parseDate(row.hearing_date_time),
      hearingStatus: row.hearing_status || null,
      unitNumber: null,
      novDescription: row.violation_description || null,
    },
    update: {
      currentStatus: row.ecb_violation_status || row.violation_status || null,
      penaltyAmount: parseDecimal(row.penalty_balance_due || row.penalty_applied || row.amount_paid),
      hearingDate: parseDate(row.hearing_date_time),
      hearingStatus: row.hearing_status || null,
    },
  };
}

export function mapHpdComplaint(row: any, buildingId: string) {
  return {
    where: { source_externalId: { source: "HPD_COMPLAINTS" as const, externalId: String(row.complaintid || row.complaint_id || "") } },
    create: {
      buildingId,
      source: "HPD_COMPLAINTS" as const,
      externalId: String(row.complaintid || row.complaint_id || ""),
      class: null,
      severity: null,
      description: row.status || row.statusdescription || "HPD Complaint",
      inspectionDate: parseDate(row.statusdate),
      issuedDate: parseDate(row.statusdate),
      currentStatus: row.status || null,
      penaltyAmount: 0,
      unitNumber: row.apartment || null,
      novDescription: row.statusdescription || null,
    },
    update: {
      currentStatus: row.status || null,
    },
  };
}
