import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { parseBuildingDataExcel, buildingRowToPrismaData } from "@/lib/building-import";
import type { ParsedBuildingRow } from "@/lib/building-import";
import { calculateNextDueDate } from "@/lib/compliance-templates";
import { findMatchingBuilding, fetchBuildingsForMatching, generateYardiId } from "@/lib/building-matching";

// POST /api/import/buildings
// ?mode=preview  → parse file, return preview of what will be created/updated
// ?mode=confirm  → actually import the data
export const POST = withAuth(async (req: NextRequest) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "preview";

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = parseBuildingDataExcel(buffer);

  if (result.buildings.length === 0) {
    return NextResponse.json({
      error: "No building data found in file",
      errors: result.errors,
    }, { status: 400 });
  }

  // Match each parsed row against existing buildings
  const existingBuildings = await fetchBuildingsForMatching();

  interface PreviewRow {
    rowIndex: number;
    address: string;
    action: "create" | "update";
    existingId?: string;
    matchedBy?: string;
  }

  const preview: PreviewRow[] = [];

  for (const row of result.buildings) {
    const match = findMatchingBuilding(row, existingBuildings);
    preview.push({
      rowIndex: row.rowIndex,
      address: row.address,
      action: match ? "update" : "create",
      existingId: match?.id,
      matchedBy: match?.matchedBy,
    });
  }

  const toCreate = preview.filter((p) => p.action === "create").length;
  const toUpdate = preview.filter((p) => p.action === "update").length;

  if (mode === "preview") {
    return NextResponse.json({
      format: "building-data",
      total: result.buildings.length,
      toCreate,
      toUpdate,
      preview,
      buildings: result.buildings,
      errors: result.errors,
    });
  }

  // ── Confirm mode: actually import ──
  let created = 0;
  let updated = 0;
  let complianceCreated = 0;
  const importErrors: string[] = [...result.errors];

  for (let i = 0; i < result.buildings.length; i++) {
    const row = result.buildings[i];
    const previewRow = preview[i];
    const prismaData = buildingRowToPrismaData(row);

    try {
      let buildingId: string;

      if (previewRow.action === "update" && previewRow.existingId) {
        // Update existing building
        await prisma.building.update({
          where: { id: previewRow.existingId },
          data: prismaData,
        });
        buildingId = previewRow.existingId;
        updated++;
      } else {
        // Create new building — need a yardiId
        const yardiId = row.yardiId || generateYardiId(row.address);
        const newBuilding = await prisma.building.create({
          data: {
            ...prismaData,
            yardiId,
            address: row.address,
          } as any,
        });
        buildingId = newBuilding.id;
        created++;
      }

      // Auto-generate compliance items from imported dates
      const compCount = await generateComplianceFromImport(buildingId, row);
      complianceCreated += compCount;
    } catch (err: any) {
      importErrors.push(`Row ${row.rowIndex} (${row.address}): ${err.message}`);
    }
  }

  // Log the import batch
  await prisma.importBatch.create({
    data: {
      filename: file.name,
      format: "building-data",
      recordCount: created + updated,
      status: "completed",
      errors: importErrors.length > 0 ? importErrors : undefined,
    },
  });

  return NextResponse.json({
    format: "building-data",
    created,
    updated,
    complianceCreated,
    total: result.buildings.length,
    errors: importErrors,
  });
}, "upload");

/** Generate compliance items from building import data dates */
async function generateComplianceFromImport(buildingId: string, row: ParsedBuildingRow): Promise<number> {
  const items: Array<{
    type: string;
    category: "INSPECTION" | "FILING" | "LOCAL_LAW";
    name: string;
    description: string;
    frequency: "ANNUAL" | "FIVE_YEAR" | "FOUR_YEAR";
    lastCompletedDate?: Date;
    status: "COMPLIANT" | "PENDING";
    nextDueDate: Date;
  }> = [];

  // Boiler inspection
  if (row.boilerInspection) {
    const d = new Date(row.boilerInspection);
    if (!isNaN(d.getTime())) {
      items.push({
        type: "BOILER_INSPECTION",
        category: "INSPECTION",
        name: "Boiler Inspection",
        description: `Annual boiler inspection. Device: ${row.boilerDevice || "N/A"}`,
        frequency: "ANNUAL",
        lastCompletedDate: d,
        status: "COMPLIANT",
        nextDueDate: calculateNextDueDate("ANNUAL", d),
      });
    }
  }

  // Elevator CAT1
  if (row.cat1Date) {
    const d = new Date(row.cat1Date);
    if (!isNaN(d.getTime())) {
      items.push({
        type: "ELEVATOR_CAT1",
        category: "INSPECTION",
        name: "Elevator CAT1 Annual",
        description: `Annual Category 1 elevator inspection. Type: ${row.elevatorType || "N/A"}`,
        frequency: "ANNUAL",
        lastCompletedDate: d,
        status: "COMPLIANT",
        nextDueDate: calculateNextDueDate("ANNUAL", d),
      });
    }
  }

  // Elevator CAT5
  if (row.cat5Date) {
    const d = new Date(row.cat5Date);
    if (!isNaN(d.getTime())) {
      items.push({
        type: "ELEVATOR_CAT5",
        category: "INSPECTION",
        name: "Elevator CAT5 Five-Year",
        description: `Five-year Category 5 full-load elevator test. Type: ${row.elevatorType || "N/A"}`,
        frequency: "FIVE_YEAR",
        lastCompletedDate: d,
        status: "COMPLIANT",
        nextDueDate: calculateNextDueDate("FIVE_YEAR", d),
      });
    }
  }

  // HPD Registration
  if (row.hpdRegistrationYear) {
    const year = parseInt(row.hpdRegistrationYear, 10);
    if (!isNaN(year)) {
      const d = new Date(year, 0, 1); // Jan 1 of that year
      items.push({
        type: "HPD_PROPERTY_REG",
        category: "FILING",
        name: "HPD Property Registration",
        description: "Annual property registration with HPD",
        frequency: "ANNUAL",
        lastCompletedDate: d,
        status: "COMPLIANT",
        nextDueDate: calculateNextDueDate("ANNUAL", d),
      });
    }
  }

  // Bed Bug Filing
  if (row.bedBugFilingYear) {
    const year = parseInt(row.bedBugFilingYear, 10);
    if (!isNaN(year)) {
      const d = new Date(year, 0, 1);
      items.push({
        type: "BEDBUG_REPORT",
        category: "FILING",
        name: "Bedbug Reporting",
        description: "Annual bedbug infestation history filing with HPD",
        frequency: "ANNUAL",
        lastCompletedDate: d,
        status: "COMPLIANT",
        nextDueDate: calculateNextDueDate("ANNUAL", d),
      });
    }
  }

  // Safety Filing
  if (row.safetyFilingYear) {
    const year = parseInt(row.safetyFilingYear, 10);
    if (!isNaN(year)) {
      const d = new Date(year, 0, 1);
      items.push({
        type: "HPD_SAFETY_MAILING",
        category: "FILING",
        name: "HPD Annual Safety Mailing",
        description: "Required annual safety notice mailing to all tenants",
        frequency: "ANNUAL",
        lastCompletedDate: d,
        status: "COMPLIANT",
        nextDueDate: calculateNextDueDate("ANNUAL", d),
      });
    }
  }

  // LL152 Gas Pipe
  if (row.ll152GasPipe) {
    const d = new Date(row.ll152GasPipe);
    const isDate = !isNaN(d.getTime());
    items.push({
      type: "LL152_GAS",
      category: "LOCAL_LAW",
      name: "LL152 Gas Piping Inspection",
      description: `Gas piping inspection. Status: ${row.ll152GasPipe}`,
      frequency: "FOUR_YEAR",
      lastCompletedDate: isDate ? d : undefined,
      status: isDate ? "COMPLIANT" : "PENDING",
      nextDueDate: isDate ? calculateNextDueDate("FOUR_YEAR", d) : calculateNextDueDate("FOUR_YEAR"),
    });
  }

  // Parapet Inspection
  if (row.parapetInspection) {
    const d = new Date(row.parapetInspection);
    if (!isNaN(d.getTime())) {
      items.push({
        type: "LL11_FISP",
        category: "LOCAL_LAW",
        name: "LL11/FISP Facade Inspection",
        description: "Facade & parapet inspection",
        frequency: "FIVE_YEAR",
        lastCompletedDate: d,
        status: "COMPLIANT",
        nextDueDate: calculateNextDueDate("FIVE_YEAR", d),
      });
    }
  }

  // Skip items that already exist for this building
  let count = 0;
  for (const item of items) {
    const existing = await prisma.complianceItem.findFirst({
      where: { buildingId, type: item.type },
    });

    if (existing) {
      // Update lastCompletedDate and nextDueDate if we have newer data
      if (item.lastCompletedDate) {
        await prisma.complianceItem.update({
          where: { id: existing.id },
          data: {
            lastCompletedDate: item.lastCompletedDate,
            nextDueDate: item.nextDueDate,
            status: item.status,
            notes: item.description,
          },
        });
        count++;
      }
    } else {
      await prisma.complianceItem.create({
        data: {
          buildingId,
          type: item.type,
          category: item.category,
          name: item.name,
          description: item.description,
          frequency: item.frequency,
          lastCompletedDate: item.lastCompletedDate,
          status: item.status,
          nextDueDate: item.nextDueDate,
          isCustom: false,
        },
      });
      count++;
    }
  }

  return count;
}
