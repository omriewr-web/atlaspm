import * as XLSX from "xlsx";
import { TenantView } from "@/types";

export function exportToExcel(tenants: TenantView[], filename: string): Buffer {
  const data = tenants.map((t) => ({
    "Building": t.buildingAddress,
    "Unit": t.unitNumber,
    "Unit Type": t.unitType || "",
    "Resident ID": t.yardiResidentId || "",
    "Name": t.name,
    "Market Rent": t.marketRent,
    "Legal Rent": t.legalRent,
    "Charge Code": t.chargeCode || "",
    "Balance": t.balance,
    "Deposit": t.deposit,
    "Arrears Category": t.arrearsCategory,
    "Days Delinquent": t.arrearsDays,
    "Months Owed": t.monthsOwed,
    "Lease Status": t.leaseStatus,
    "Lease Expiration": t.leaseExpiration || "",
    "Move-In": t.moveInDate || "",
    "Collection Score": t.collectionScore,
    "Legal Flag": t.legalFlag ? "Yes" : "No",
    "Legal Stage": t.legalStage || "",
    "Notes": t.noteCount,
    "Payments": t.paymentCount,
    "Entity": t.entity || "",
    "Portfolio": t.portfolio || "",
    "Region": t.buildingRegion || "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  const colWidths = Object.keys(data[0] || {}).map((k) => ({
    wch: Math.max(k.length, 12),
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, filename.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 31) || "Export");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
