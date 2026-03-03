import * as XLSX from "xlsx";

export interface ParsedTenant {
  property: string;
  unit: string;
  unitType?: string;
  residentId?: string;
  name: string;
  marketRent: number;
  chargeCode?: string;
  chargeAmount: number;
  deposit: number;
  balance: number;
  moveIn?: string;
  leaseExpiration?: string;
  moveOut?: string;
  isVacant: boolean;
}

export interface ParseResult {
  tenants: ParsedTenant[];
  propertyName: string;
  errors: string[];
}

function col(row: any, ...keys: string[]): any {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  return undefined;
}

function num(v: any): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v.replace(/[$,]/g, "")) : Number(v);
  return isNaN(n) ? 0 : n;
}

function dateStr(v: any): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString().split("T")[0];
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const parsed = new Date(v);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split("T")[0];
}

export function parseRentRollExcel(buffer: Buffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const errors: string[] = [];
  const tenants: ParsedTenant[] = [];
  let propertyName = "";

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const unit = String(col(r, "Unit", "unit", "UNIT", "Unit Number", "UnitNumber", "unit_number") ?? "").trim();
    const name = String(col(r, "Name", "name", "NAME", "Resident Name", "ResidentName", "Tenant", "tenant") ?? "").trim();

    if (!unit && !name) continue;
    if (!unit) { errors.push(`Row ${i + 2}: missing unit number`); continue; }
    if (!name && !String(col(r, "Vacant", "vacant", "VACANT", "Status") ?? "").toLowerCase().includes("vacant")) continue;

    if (!propertyName) {
      propertyName = String(col(r, "Property", "property", "PROPERTY", "Building", "building") ?? "Property").trim();
    }

    const isVacant = !name || name.toLowerCase() === "vacant" ||
      String(col(r, "Vacant", "vacant", "Status", "status") ?? "").toLowerCase().includes("vacant");

    tenants.push({
      property: String(col(r, "Property", "property", "PROPERTY", "Building", "PropertyCode", "Prop") ?? "").trim(),
      unit,
      unitType: String(col(r, "Unit Type", "UnitType", "unit_type", "Type") ?? "").trim() || undefined,
      residentId: String(col(r, "Resident ID", "ResidentID", "residentId", "ID", "Resident") ?? "").trim() || undefined,
      name: isVacant ? "VACANT" : name,
      marketRent: num(col(r, "Market Rent", "MarketRent", "market_rent", "Rent", "rent")),
      chargeCode: String(col(r, "Charge Code", "ChargeCode", "charge_code") ?? "").trim() || undefined,
      chargeAmount: num(col(r, "Charge Amount", "ChargeAmount", "Amount", "amount")),
      deposit: num(col(r, "Deposit", "deposit", "Security Deposit")),
      balance: num(col(r, "Balance", "balance", "BALANCE", "Total Balance", "Delinquent")),
      moveIn: dateStr(col(r, "Move In", "MoveIn", "move_in", "Move-In Date")),
      leaseExpiration: dateStr(col(r, "Lease Expiration", "LeaseExpiration", "lease_expiration", "Lease Exp", "Lease End")),
      moveOut: dateStr(col(r, "Move Out", "MoveOut", "move_out")),
      isVacant,
    });
  }

  return { tenants, propertyName, errors };
}
