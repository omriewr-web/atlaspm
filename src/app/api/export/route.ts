export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { exportToExcel } from "@/lib/excel-export";
import { getTenantScope, EMPTY_SCOPE } from "@/lib/data-scope";
import { getDisplayAddress } from "@/lib/building-matching";
import { TenantView } from "@/types";

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const buildingId = url.searchParams.get("buildingId");
  const scope = getTenantScope(user, buildingId);
  if (scope === EMPTY_SCOPE) {
    return new NextResponse("No data", { status: 204 });
  }
  const where = { ...scope };

  const tenants = await prisma.tenant.findMany({
    where,
    include: {
      unit: { include: { building: { select: { id: true, address: true, altAddress: true, region: true, entity: true, portfolio: true } } } },
      legalCases: { where: { isActive: true }, select: { inLegal: true, stage: true }, take: 1 },
      _count: { select: { notes: true, payments: true, tasks: true } },
    },
    orderBy: { balance: "desc" },
  });

  const views: TenantView[] = tenants.map((t) => ({
    id: t.id,
    unitId: t.unitId,
    yardiResidentId: t.yardiResidentId,
    name: t.name,
    email: t.email,
    phone: t.phone,
    unitNumber: t.unit.unitNumber,
    unitType: t.unit.unitType,
    buildingId: t.unit.building.id,
    buildingAddress: t.unit.building.address,
    altAddress: t.unit.building.altAddress,
    region: t.unit.building.region ?? "",
    entity: t.unit.building.entity ?? "",
    portfolio: t.unit.building.portfolio ?? "",
    marketRent: t.marketRent,
    legalRent: t.legalRent,
    prefRent: t.prefRent,
    chargeCode: t.chargeCode ?? "",
    balance: t.balance,
    deposit: t.deposit,
    arrears: t.arrears,
    arrearsCategory: t.arrearsCategory,
    arrearsDays: t.arrearsDays,
    monthsOwed: t.monthsOwed,
    leaseStatus: t.leaseStatus,
    leaseExpiration: t.leaseExpiration,
    moveInDate: t.moveInDate,
    moveOutDate: t.moveOutDate,
    collectionScore: t.collectionScore,
    collectionStatus: t.collectionStatus,
    legalFlag: t.legalFlag,
    legalStage: t.legalCases?.[0]?.stage ?? "",
    noteCount: t._count.notes,
    paymentCount: t._count.payments,
    taskCount: t._count.tasks,
    buildingRegion: t.unit.building.region ?? "",
    monthlyRent: t.marketRent,
  }));

  const filename = `tenants-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = exportToExcel(views, filename);

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
