import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { normalizeAddress } from "@/lib/building-matching";
import { matchLegalCase, type LegalCaseRow, type TenantRecord, type MatchResult } from "@/lib/legal-matching";
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

function numVal(v: any): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "string" ? parseFloat(v.replace(/[$,]/g, "")) : Number(v);
  return isNaN(n) ? 0 : n;
}

function col(row: any, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return String(row[k]).trim();
  }
  return "";
}

export const POST = withAuth(async (req: NextRequest, { user }) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const mode = new URL(req.url).searchParams.get("mode") || "import"; // preview | import

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

  const dbTenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      balance: true,
      unit: { select: { unitNumber: true, buildingId: true, building: { select: { address: true } } } },
    },
  });

  const tenantRecords: TenantRecord[] = dbTenants.map((t) => ({
    id: t.id,
    name: t.name,
    unitNumber: t.unit.unitNumber,
    buildingId: t.unit.buildingId,
    buildingAddress: t.unit.building.address,
    balance: Number(t.balance),
  }));

  // Parse each row into a LegalCaseRow
  const legalRows: LegalCaseRow[] = rows.map((row, i) => ({
    address: col(row, "Building Address", "Building", "Address", "Property", "Property Address"),
    unit: col(row, "Unit", "Unit Number", "Apt", "Apt #", "Apt Number", "Unit #"),
    tenantName: col(row, "Tenant Name", "Tenant", "Name", "Resident", "Respondent", "Defendant"),
    caseNumber: col(row, "Case Number", "Case #", "Case No", "Docket", "Index Number", "Index #", "Index No"),
    attorney: col(row, "Attorney", "Atty", "Lawyer", "Counsel"),
    filingDate: parseDate(row["Date Filed"] || row["Filed Date"] || row["Filed"] || row["Filing Date"]),
    courtDate: parseDate(row["Court Date"] || row["Next Court Date"] || row["Hearing Date"]),
    legalStage: col(row, "Legal Stage", "Stage", "Case Type", "Type", "Proceeding Type"),
    arrearsBalance: numVal(row["Arrears Balance"] || row["Balance"] || row["Amount Owed"] || row["Arrears"]),
    notes: col(row, "Notes", "Note", "Comments", "Description"),
    status: col(row, "Status", "Case Status"),
    rowIndex: i,
  }));

  // Match each row
  const matchResults: MatchResult[] = legalRows
    .filter((r) => r.tenantName || r.address || r.unit)
    .map((r) => matchLegalCase(r, tenantRecords, addressToBuildingId));

  // Preview mode — return match results without importing
  if (mode === "preview") {
    const summary = {
      total: matchResults.length,
      exact: matchResults.filter((m) => m.matchType === "exact").length,
      likely: matchResults.filter((m) => m.matchType === "likely").length,
      needsReview: matchResults.filter((m) => m.matchType === "needs_review").length,
      noMatch: matchResults.filter((m) => m.matchType === "no_match").length,
    };

    return NextResponse.json({
      summary,
      matches: matchResults.map((m) => ({
        rowIndex: m.row.rowIndex,
        sourceAddress: m.row.address,
        sourceUnit: m.row.unit,
        sourceTenantName: m.row.tenantName,
        sourceCaseNumber: m.row.caseNumber,
        sourceStage: m.row.legalStage,
        sourceBalance: m.row.arrearsBalance,
        matchType: m.matchType,
        confidence: m.confidence,
        matchedTenantId: m.tenant?.id || null,
        matchedTenantName: m.tenant?.name || null,
        matchedBuilding: m.tenant?.buildingAddress || null,
        matchedUnit: m.tenant?.unitNumber || null,
        reasons: m.reasons,
      })),
    });
  }

  // Import mode — create batch and process
  const importBatch = await prisma.importBatch.create({
    data: {
      filename: file.name,
      format: "legal-cases",
      recordCount: 0,
      status: "processing",
    },
  });

  let imported = 0;
  let skipped = 0;
  let queued = 0;
  const errors: string[] = [];

  for (const match of matchResults) {
    const { row } = match;
    const rowNum = row.rowIndex + 2;

    // Auto-import exact and likely matches
    if ((match.matchType === "exact" || match.matchType === "likely") && match.tenant) {
      const stage = parseStage(row.legalStage);
      try {
        await prisma.legalCase.upsert({
          where: { tenantId: match.tenant.id },
          create: {
            tenantId: match.tenant.id,
            inLegal: true,
            stage,
            caseNumber: row.caseNumber || null,
            attorney: row.attorney || null,
            filedDate: row.filingDate,
            courtDate: row.courtDate,
            arrearsBalance: row.arrearsBalance || null,
            status: row.status || "active",
            importBatchId: importBatch.id,
          },
          update: {
            inLegal: true,
            stage,
            ...(row.caseNumber ? { caseNumber: row.caseNumber } : {}),
            ...(row.attorney ? { attorney: row.attorney } : {}),
            ...(row.filingDate ? { filedDate: row.filingDate } : {}),
            ...(row.courtDate ? { courtDate: row.courtDate } : {}),
            ...(row.arrearsBalance ? { arrearsBalance: row.arrearsBalance } : {}),
            ...(row.status ? { status: row.status } : {}),
            importBatchId: importBatch.id,
          },
        });

        // Add note if provided
        if (row.notes) {
          const legalCase = await prisma.legalCase.findUnique({ where: { tenantId: match.tenant.id } });
          if (legalCase) {
            await prisma.legalNote.create({
              data: {
                legalCaseId: legalCase.id,
                authorId: user.id,
                text: `[Import] ${row.notes}`,
                stage,
              },
            });
          }
        }

        await prisma.importRow.create({
          data: {
            importBatchId: importBatch.id,
            rowIndex: row.rowIndex,
            rawData: row as any,
            status: match.matchType === "exact" ? "CREATED" : "UPDATED",
            entityType: "legal_case",
            entityId: match.tenant.id,
          },
        });

        imported++;
      } catch (e: any) {
        errors.push(`Row ${rowNum}: ${row.tenantName} — ${e.message}`);
        skipped++;
      }
    } else {
      // Send to review queue
      try {
        await prisma.legalImportQueue.create({
          data: {
            importBatchId: importBatch.id,
            rowIndex: row.rowIndex,
            rawData: row as any,
            matchType: match.matchType,
            matchConfidence: match.confidence,
            candidateTenantId: match.tenant?.id || null,
            candidateTenantName: match.tenant?.name || null,
            candidateBuildingAddress: match.tenant?.buildingAddress || null,
            candidateUnitNumber: match.tenant?.unitNumber || null,
            sourceAddress: row.address || null,
            sourceUnit: row.unit || null,
            sourceTenantName: row.tenantName || null,
            sourceCaseNumber: row.caseNumber || null,
            status: "pending",
          },
        });
        queued++;
      } catch (e: any) {
        errors.push(`Row ${rowNum}: Failed to queue — ${e.message}`);
        skipped++;
      }
    }
  }

  // Update batch
  await prisma.importBatch.update({
    where: { id: importBatch.id },
    data: {
      recordCount: imported,
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      errors: errors.length > 0 ? errors : undefined,
    },
  });

  return NextResponse.json({
    imported,
    skipped,
    queued,
    errors,
    total: matchResults.length,
    batchId: importBatch.id,
    summary: {
      exact: matchResults.filter((m) => m.matchType === "exact").length,
      likely: matchResults.filter((m) => m.matchType === "likely").length,
      needsReview: matchResults.filter((m) => m.matchType === "needs_review").length,
      noMatch: matchResults.filter((m) => m.matchType === "no_match").length,
    },
  });
}, "upload");
