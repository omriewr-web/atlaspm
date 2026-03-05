import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { normalizeAddress } from "@/lib/building-matching";
import { LegalStage } from "@prisma/client";

const STAGE_MAP: Record<string, LegalStage> = {
  "notice sent": "NOTICE_SENT",
  "notice": "NOTICE_SENT",
  "holdover": "HOLDOVER",
  "nonpayment": "NONPAYMENT",
  "non-payment": "NONPAYMENT",
  "non payment": "NONPAYMENT",
  "court date": "COURT_DATE",
  "court": "COURT_DATE",
  "stipulation": "STIPULATION",
  "stip": "STIPULATION",
  "judgment": "JUDGMENT",
  "judgement": "JUDGMENT",
  "warrant": "WARRANT",
  "eviction": "EVICTION",
  "settled": "SETTLED",
};

function parseStage(value: string | undefined | null): LegalStage {
  if (!value) return "NONPAYMENT";
  const normalized = value.toLowerCase().replace(/[_-]/g, " ").trim();
  return STAGE_MAP[normalized] || "NONPAYMENT";
}

function parseDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  const parsed = new Date(String(v));
  return isNaN(parsed.getTime()) ? null : parsed;
}

function col(row: any, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return String(row[k]).trim();
  }
  return "";
}

export const POST = withAuth(async (req, { user }) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet) as any[];

  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows found in spreadsheet" }, { status: 400 });
  }

  // Build lookup maps
  const buildings = await prisma.building.findMany({
    select: { id: true, address: true, altAddress: true },
  });
  const addressToBuildingId = new Map<string, string>();
  for (const b of buildings) {
    addressToBuildingId.set(normalizeAddress(b.address), b.id);
    if (b.altAddress) addressToBuildingId.set(normalizeAddress(b.altAddress), b.id);
  }

  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      unit: { select: { unitNumber: true, buildingId: true } },
    },
  });

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Excel row (1-indexed header + data)

    const buildingAddr = col(row, "Building Address", "Building", "Address", "Property");
    const unitNum = col(row, "Unit", "Unit Number", "Apt", "Apt #");
    const tenantName = col(row, "Tenant Name", "Tenant", "Name", "Resident");
    const caseNumber = col(row, "Case Number", "Case #", "Case No", "Docket");
    const caseType = col(row, "Case Type", "Type");
    const legalStage = col(row, "Legal Stage", "Stage", "Status");
    const attorney = col(row, "Attorney", "Atty", "Lawyer");
    const dateFiled = parseDate(row["Date Filed"] || row["Filed Date"] || row["Filed"]);
    const notes = col(row, "Notes", "Note", "Comments");

    if (!tenantName) {
      errors.push(`Row ${rowNum}: Missing tenant name`);
      skipped++;
      continue;
    }

    // Find building
    let buildingId: string | undefined;
    if (buildingAddr) {
      buildingId = addressToBuildingId.get(normalizeAddress(buildingAddr));
    }

    // Find tenant by name + unit + building
    const normalizedTenantName = tenantName.toLowerCase();
    const matchingTenants = tenants.filter((t) => {
      const nameMatch = t.name.toLowerCase() === normalizedTenantName;
      if (!nameMatch) return false;
      if (buildingId && t.unit.buildingId !== buildingId) return false;
      if (unitNum && t.unit.unitNumber !== unitNum) return false;
      return true;
    });

    if (matchingTenants.length === 0) {
      // Try fuzzy name match (contains)
      const fuzzyMatches = tenants.filter((t) => {
        const nameMatch = t.name.toLowerCase().includes(normalizedTenantName) ||
          normalizedTenantName.includes(t.name.toLowerCase());
        if (!nameMatch) return false;
        if (buildingId && t.unit.buildingId !== buildingId) return false;
        if (unitNum && t.unit.unitNumber !== unitNum) return false;
        return true;
      });

      if (fuzzyMatches.length === 1) {
        matchingTenants.push(fuzzyMatches[0]);
      } else {
        errors.push(`Row ${rowNum}: Tenant "${tenantName}" not found${buildingAddr ? ` at ${buildingAddr}` : ""}${unitNum ? ` #${unitNum}` : ""}`);
        skipped++;
        continue;
      }
    }

    const tenant = matchingTenants[0];
    const stage = parseStage(legalStage || caseType);

    try {
      const legalCase = await prisma.legalCase.upsert({
        where: { tenantId: tenant.id },
        create: {
          tenantId: tenant.id,
          inLegal: true,
          stage,
          caseNumber: caseNumber || null,
          attorney: attorney || null,
          filedDate: dateFiled,
        },
        update: {
          inLegal: true,
          stage,
          ...(caseNumber ? { caseNumber } : {}),
          ...(attorney ? { attorney } : {}),
          ...(dateFiled ? { filedDate: dateFiled } : {}),
        },
      });

      // Add note if provided
      if (notes) {
        await prisma.legalNote.create({
          data: {
            legalCaseId: legalCase.id,
            authorId: user.id,
            text: notes,
            stage,
          },
        });
      }

      imported++;
    } catch (e: any) {
      errors.push(`Row ${rowNum}: ${tenantName} — ${e.message}`);
      skipped++;
    }
  }

  await prisma.importBatch.create({
    data: {
      filename: file.name,
      format: "legal-cases",
      recordCount: imported,
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      errors: errors.length > 0 ? errors : undefined,
    },
  });

  return NextResponse.json({ imported, skipped, errors, total: rows.length });
}, "upload");
