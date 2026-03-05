import { prisma } from "./prisma";
import {
  detectBoroId,
  fetchHpdViolations,
  fetchDobViolations,
  fetchEcbViolations,
  fetchHpdComplaints,
  mapHpdViolation,
  mapDobViolation,
  mapEcbViolation,
  mapHpdComplaint,
} from "./nyc-open-data";

type Source = "HPD" | "DOB" | "ECB" | "HPD_COMPLAINTS";

interface SyncResult {
  buildingId: string;
  address: string;
  source: string;
  newCount: number;
  updatedCount: number;
  error?: string;
}

export async function syncBuildingViolations(
  buildingId: string,
  sources?: string[]
): Promise<SyncResult[]> {
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { id: true, address: true, block: true, lot: true, zip: true },
  });

  if (!building || !building.block || !building.lot) {
    return [{ buildingId, address: building?.address || "", source: "ALL", newCount: 0, updatedCount: 0, error: "Missing block/lot" }];
  }

  const boroId = detectBoroId(building.address, building.zip);
  if (!boroId) {
    return [{ buildingId, address: building.address, source: "ALL", newCount: 0, updatedCount: 0, error: "Could not detect borough" }];
  }

  const activeSources: Source[] = (sources?.length
    ? sources.filter((s): s is Source => ["HPD", "DOB", "ECB", "HPD_COMPLAINTS"].includes(s))
    : ["HPD", "DOB", "ECB", "HPD_COMPLAINTS"]);

  const results: SyncResult[] = [];

  for (const source of activeSources) {
    let newCount = 0;
    let updatedCount = 0;
    try {
      let rows: any[] = [];
      let mapper: (row: any, bid: string) => any;

      switch (source) {
        case "HPD":
          rows = await fetchHpdViolations(building.block, building.lot, boroId);
          mapper = mapHpdViolation;
          break;
        case "DOB":
          rows = await fetchDobViolations(building.block, building.lot, boroId);
          mapper = mapDobViolation;
          break;
        case "ECB":
          rows = await fetchEcbViolations(building.block, building.lot, boroId);
          mapper = mapEcbViolation;
          break;
        case "HPD_COMPLAINTS":
          rows = await fetchHpdComplaints(building.block, building.lot, boroId);
          mapper = mapHpdComplaint;
          break;
      }

      for (const row of rows) {
        const mapped = mapper(row, buildingId);
        if (!mapped.where.source_externalId.externalId) continue;

        const existing = await prisma.violation.findUnique({ where: mapped.where });

        if (existing) {
          await prisma.violation.update({ where: { id: existing.id }, data: mapped.update });
          updatedCount++;
        } else {
          const created = await prisma.violation.create({ data: mapped.create });
          newCount++;

          // Auto-create work order for HPD Class C (Immediately Hazardous)
          if (
            mapped.create.class === "C" ||
            mapped.create.severity === "IMMEDIATELY_HAZARDOUS"
          ) {
            const wo = await prisma.workOrder.create({
              data: {
                title: `[AUTO] ${source} Violation - ${mapped.create.externalId}`,
                description: `Auto-created from ${source} violation.\n\n${mapped.create.description || mapped.create.novDescription || ""}`,
                status: "OPEN",
                priority: "URGENT",
                category: "GENERAL",
                buildingId,
              },
            });
            await prisma.violation.update({
              where: { id: created.id },
              data: { linkedWorkOrderId: wo.id },
            });
          }
        }
      }

      await prisma.violationSyncLog.create({
        data: { buildingId, source, newCount, updatedCount, status: "completed" },
      });

      results.push({ buildingId, address: building.address, source, newCount, updatedCount });
    } catch (err: any) {
      console.error(`Sync error for ${source} on ${building.address}:`, err);
      await prisma.violationSyncLog.create({
        data: { buildingId, source, newCount: 0, updatedCount: 0, status: `error: ${err.message}` },
      });
      results.push({ buildingId, address: building.address, source, newCount: 0, updatedCount: 0, error: err.message });
    }
  }

  return results;
}

export async function syncAllBuildings(sources?: string[]): Promise<SyncResult[]> {
  const buildings = await prisma.building.findMany({
    where: {
      block: { not: null },
      lot: { not: null },
    },
    select: { id: true },
  });

  const allResults: SyncResult[] = [];
  for (const building of buildings) {
    const results = await syncBuildingViolations(building.id, sources);
    allResults.push(...results);
  }
  return allResults;
}
