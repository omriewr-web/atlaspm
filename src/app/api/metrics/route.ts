import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, buildWhereClause } from "@/lib/api-helpers";
import { PortfolioMetrics } from "@/types";

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const buildingId = url.searchParams.get("buildingId");
  const where = buildWhereClause(user, buildingId);

  const tenants = await prisma.tenant.findMany({
    where,
    select: {
      marketRent: true,
      balance: true,
      arrearsCategory: true,
      leaseStatus: true,
      unit: { select: { isVacant: true } },
    },
  });

  const units = await prisma.unit.count({
    where: buildingId
      ? { buildingId }
      : user.role !== "ADMIN" && user.assignedProperties?.length
        ? { buildingId: { in: user.assignedProperties } }
        : {},
  });

  const legalCaseCount = await prisma.legalCase.count({
    where: { inLegal: true, ...(where.unit ? { tenant: { unit: where.unit } } : {}) },
  });

  const occupied = tenants.filter((t) => !t.unit.isVacant).length;
  const vacant = units - occupied;
  const totalMarketRent = tenants.reduce((s, t) => s + Number(t.marketRent), 0);
  const totalBalance = tenants.reduce((s, t) => s + Number(t.balance), 0);
  const lostRent = tenants
    .filter((t) => t.unit.isVacant)
    .reduce((s, t) => s + Number(t.marketRent), 0);

  const metrics: PortfolioMetrics = {
    totalUnits: units,
    occupied,
    vacant,
    totalMarketRent,
    totalBalance,
    occupancyRate: units > 0 ? (occupied / units) * 100 : 0,
    lostRent,
    arrears30: tenants.filter((t) => t.arrearsCategory === "30").length,
    arrears60: tenants.filter((t) => t.arrearsCategory === "60").length,
    arrears90Plus: tenants.filter((t) => ["90", "120+"].includes(t.arrearsCategory)).length,
    legalCaseCount,
    noLease: tenants.filter((t) => t.leaseStatus === "no-lease").length,
    expiredLease: tenants.filter((t) => t.leaseStatus === "expired").length,
    expiringSoon: tenants.filter((t) => t.leaseStatus === "expiring-soon").length,
  };

  return NextResponse.json(metrics);
});
