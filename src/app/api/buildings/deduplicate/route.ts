import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { normalizeAddress, normalizeBlockLot } from "@/lib/building-matching";

// GET /api/buildings/deduplicate?mode=scan
export const GET = withAuth(async (req: NextRequest) => {
  const buildings = await prisma.building.findMany({
    select: {
      id: true,
      address: true,
      block: true,
      lot: true,
      entity: true,
      yardiId: true,
      _count: {
        select: {
          units: true,
          violations: true,
          complianceItems: true,
        },
      },
    },
  });

  // Also count tenants per building
  const tenantCounts = await prisma.tenant.groupBy({
    by: ["unitId"],
    _count: true,
  });
  const unitBuilding = await prisma.unit.findMany({
    select: { id: true, buildingId: true },
  });
  const unitToBuildingMap = new Map(unitBuilding.map((u) => [u.id, u.buildingId]));
  const buildingTenantCount = new Map<string, number>();
  for (const tc of tenantCounts) {
    const bId = unitToBuildingMap.get(tc.unitId);
    if (bId) buildingTenantCount.set(bId, (buildingTenantCount.get(bId) || 0) + tc._count);
  }

  // Group by normalized block+lot
  const blockLotGroups = new Map<string, typeof buildings>();
  const addressGroups = new Map<string, typeof buildings>();
  const yardiIdGroups = new Map<string, typeof buildings>();
  const matched = new Set<string>();

  // Build a yardiId lookup: yardiId → building (only for buildings with block/lot, i.e. "real" records)
  const yardiIdMap = new Map<string, (typeof buildings)[0]>();
  for (const b of buildings) {
    if (b.yardiId && b.block && b.lot) {
      yardiIdMap.set(b.yardiId.toLowerCase(), b);
    }
  }

  for (const b of buildings) {
    if (b.block && b.lot) {
      const key = `${normalizeBlockLot(b.block)}|${normalizeBlockLot(b.lot)}`;
      if (!blockLotGroups.has(key)) blockLotGroups.set(key, []);
      blockLotGroups.get(key)!.push(b);
    }
  }

  // Mark buildings already grouped by block+lot
  for (const [, group] of blockLotGroups) {
    if (group.length >= 2) {
      for (const b of group) matched.add(b.id);
    }
  }

  // Group remaining by normalized address
  for (const b of buildings) {
    if (matched.has(b.id)) continue;
    const key = normalizeAddress(b.address);
    if (!addressGroups.has(key)) addressGroups.set(key, []);
    addressGroups.get(key)!.push(b);
  }

  // Mark buildings already grouped by address
  for (const [, group] of addressGroups) {
    if (group.length >= 2) {
      for (const b of group) matched.add(b.id);
    }
  }

  // Match remaining by yardiId extraction: "Entity Name(yardiCode)" → look up yardiCode
  for (const b of buildings) {
    if (matched.has(b.id)) continue;
    // Extract yardiId from parenthesized pattern in address or yardiId field
    const parenMatch = (b.yardiId || b.address || "").match(/\(([^)]+)\)$/);
    if (parenMatch) {
      const extractedId = parenMatch[1].toLowerCase();
      const realBuilding = yardiIdMap.get(extractedId);
      if (realBuilding && realBuilding.id !== b.id) {
        const key = extractedId;
        if (!yardiIdGroups.has(key)) {
          yardiIdGroups.set(key, [realBuilding]);
          matched.add(realBuilding.id);
        }
        yardiIdGroups.get(key)!.push(b);
        matched.add(b.id);
      }
    }
  }

  interface DupBuilding {
    id: string;
    address: string;
    block: string | null;
    lot: string | null;
    entity: string | null;
    unitCount: number;
    tenantCount: number;
    violationCount: number;
    complianceCount: number;
  }

  interface DuplicateSet {
    matchedBy: string;
    buildings: DupBuilding[];
  }

  const duplicateSets: DuplicateSet[] = [];

  const toBuildingInfo = (b: (typeof buildings)[0]): DupBuilding => ({
    id: b.id,
    address: b.address,
    block: b.block,
    lot: b.lot,
    entity: b.entity,
    unitCount: b._count.units,
    tenantCount: buildingTenantCount.get(b.id) || 0,
    violationCount: b._count.violations,
    complianceCount: b._count.complianceItems,
  });

  for (const [, group] of blockLotGroups) {
    if (group.length >= 2) {
      duplicateSets.push({
        matchedBy: "block+lot",
        buildings: group.map(toBuildingInfo),
      });
    }
  }

  for (const [, group] of addressGroups) {
    if (group.length >= 2) {
      duplicateSets.push({
        matchedBy: "address",
        buildings: group.map(toBuildingInfo),
      });
    }
  }

  for (const [, group] of yardiIdGroups) {
    if (group.length >= 2) {
      duplicateSets.push({
        matchedBy: "yardiId",
        buildings: group.map(toBuildingInfo),
      });
    }
  }

  // Also flag "junk" buildings like "All Properties" with no relations
  const junkBuildings = buildings.filter(
    (b) =>
      !matched.has(b.id) &&
      !b.block &&
      !b.lot &&
      b._count.units === 0 &&
      b._count.violations === 0 &&
      b._count.complianceItems === 0 &&
      (buildingTenantCount.get(b.id) || 0) === 0
  );
  if (junkBuildings.length > 0) {
    duplicateSets.push({
      matchedBy: "orphan (no data, no block/lot)",
      buildings: junkBuildings.map(toBuildingInfo),
    });
  }

  return NextResponse.json({ duplicateSets });
});

// POST /api/buildings/deduplicate — merge duplicates
export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { keepId, mergeIds } = body as { keepId: string; mergeIds: string[] };

  if (!keepId || !mergeIds?.length) {
    return NextResponse.json({ error: "keepId and mergeIds required" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let movedUnits = 0;
    let movedViolations = 0;
    let movedCompliance = 0;

    const keepBuilding = await tx.building.findUnique({ where: { id: keepId } });
    if (!keepBuilding) throw new Error("Keep building not found");

    for (const mergeId of mergeIds) {
      const mergeBuilding = await tx.building.findUnique({ where: { id: mergeId } });
      if (!mergeBuilding) continue;

      // Move units — check for unitNumber conflicts
      const mergeUnits = await tx.unit.findMany({ where: { buildingId: mergeId } });
      const keepUnits = await tx.unit.findMany({
        where: { buildingId: keepId },
        select: { unitNumber: true },
      });
      const keepUnitNumbers = new Set(keepUnits.map((u) => u.unitNumber));

      for (const unit of mergeUnits) {
        let unitNumber = unit.unitNumber;
        if (keepUnitNumbers.has(unitNumber)) {
          // Rename conflicting unit with suffix
          let suffix = 2;
          while (keepUnitNumbers.has(`${unitNumber}-${suffix}`)) suffix++;
          unitNumber = `${unitNumber}-${suffix}`;
        }
        await tx.unit.update({
          where: { id: unit.id },
          data: { buildingId: keepId, unitNumber },
        });
        keepUnitNumbers.add(unitNumber);
        movedUnits++;
      }

      // Move violations
      const violationResult = await tx.violation.updateMany({
        where: { buildingId: mergeId },
        data: { buildingId: keepId },
      });
      movedViolations += violationResult.count;

      // Move compliance items — skip if same type already exists on keepId
      const mergeCompliance = await tx.complianceItem.findMany({
        where: { buildingId: mergeId },
      });
      const keepComplianceTypes = await tx.complianceItem.findMany({
        where: { buildingId: keepId },
        select: { type: true },
      });
      const keepTypes = new Set(keepComplianceTypes.map((c) => c.type));
      for (const item of mergeCompliance) {
        if (keepTypes.has(item.type)) {
          // Delete the duplicate compliance item
          await tx.complianceItem.delete({ where: { id: item.id } });
        } else {
          await tx.complianceItem.update({
            where: { id: item.id },
            data: { buildingId: keepId },
          });
          movedCompliance++;
        }
      }

      // Move violation sync logs
      await tx.violationSyncLog.updateMany({
        where: { buildingId: mergeId },
        data: { buildingId: keepId },
      });

      // Move work orders
      await tx.workOrder.updateMany({
        where: { buildingId: mergeId },
        data: { buildingId: keepId },
      });

      // Copy non-null fields from mergeBuilding to keepBuilding (fill gaps)
      const fillFields = [
        "altAddress", "entity", "portfolio", "region", "zip", "block", "lot",
        "owner", "ownerEmail", "manager", "arTeam", "apTeam", "headPortfolio",
        "mgmtStartDate", "einNumber", "bin", "mdrNumber", "dhcrRegId",
        "squareFootage", "yearBuilt", "constructionType", "floors", "floorsBelowGround",
        "lifeSafety", "elevatorInfo", "boilerInfo", "complianceDates",
        "superintendent", "elevatorCompany", "fireAlarmCompany",
        "utilityMeters", "utilityAccounts",
      ] as const;

      const updates: Record<string, any> = {};
      for (const field of fillFields) {
        if ((keepBuilding as any)[field] == null && (mergeBuilding as any)[field] != null) {
          updates[field] = (mergeBuilding as any)[field];
        }
      }
      if (Object.keys(updates).length > 0) {
        await tx.building.update({ where: { id: keepId }, data: updates });
      }

      // Delete the duplicate building (cascade will handle remaining relations)
      await tx.building.delete({ where: { id: mergeId } });
    }

    return { merged: mergeIds.length, kept: keepId, movedUnits, movedViolations, movedCompliance };
  }, { timeout: 30000 });

  return NextResponse.json(result);
}, "upload");
