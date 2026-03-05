import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { parseBuildingDataExcel, buildingRowToPrismaData } from "@/lib/parsers/buildingParser";
import type { ParsedBuildingRow } from "@/lib/parsers/buildingParser";
import { normalizeAddress, normalizeBlockLot, generateYardiId } from "@/lib/building-matching";

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

  // Load existing buildings for matching
  const existingBuildings = await prisma.building.findMany({
    select: {
      id: true,
      address: true,
      block: true,
      lot: true,
      yardiId: true,
    },
  });

  interface PreviewRow {
    rowIndex: number;
    address: string;
    buildingId: string;
    action: "create" | "update";
    existingId?: string;
    matchedBy?: string;
  }

  const preview: PreviewRow[] = [];

  for (const row of result.buildings) {
    const match = matchBuilding(row, existingBuildings);
    preview.push({
      rowIndex: row.rowIndex,
      address: row.address,
      buildingId: row.buildingId,
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
  const importErrors: string[] = [...result.errors];

  for (let i = 0; i < result.buildings.length; i++) {
    const row = result.buildings[i];
    const previewRow = preview[i];
    const prismaData = buildingRowToPrismaData(row);

    try {
      if (previewRow.action === "update" && previewRow.existingId) {
        await prisma.building.update({
          where: { id: previewRow.existingId },
          data: prismaData,
        });
        updated++;
      } else {
        // Use building_id from template as yardiId, or generate one
        const yardiId = row.buildingId || generateYardiId(row.address);
        await prisma.building.create({
          data: {
            ...prismaData,
            yardiId,
            address: row.address,
          } as any,
        });
        created++;
      }
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
      status: importErrors.length > 0 ? "completed_with_errors" : "completed",
      errors: importErrors.length > 0 ? importErrors : undefined,
    },
  });

  return NextResponse.json({
    format: "building-data",
    created,
    updated,
    total: result.buildings.length,
    errors: importErrors,
  });
}, "upload");

/**
 * Match a parsed row against existing buildings.
 * Priority: 1) block+lot  2) normalized address  3) yardiId/building_id
 */
function matchBuilding(
  row: ParsedBuildingRow,
  existing: Array<{ id: string; address: string; block: string | null; lot: string | null; yardiId: string }>
): { id: string; matchedBy: string } | null {
  // 1. Block + Lot match (primary)
  if (row.block && row.lot) {
    const normBlock = normalizeBlockLot(row.block);
    const normLot = normalizeBlockLot(row.lot);
    const match = existing.find(
      (b) =>
        b.block && b.lot &&
        normalizeBlockLot(b.block) === normBlock &&
        normalizeBlockLot(b.lot) === normLot
    );
    if (match) return { id: match.id, matchedBy: "block+lot" };
  }

  // 2. Normalized address match (fallback)
  const normAddr = normalizeAddress(row.address);
  const addrMatch = existing.find((b) => normalizeAddress(b.address) === normAddr);
  if (addrMatch) return { id: addrMatch.id, matchedBy: "address" };

  // 3. building_id → yardiId match
  if (row.buildingId) {
    const idMatch = existing.find((b) => b.yardiId === row.buildingId);
    if (idMatch) return { id: idMatch.id, matchedBy: "building_id" };
  }

  return null;
}
