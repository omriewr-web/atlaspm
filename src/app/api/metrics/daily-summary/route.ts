import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, buildWhereClause } from "@/lib/api-helpers";

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const buildingId = url.searchParams.get("buildingId");
  const where = buildWhereClause(user, buildingId);

  const [urgentTenants, recentNotes, recentPayments, legalCases] = await Promise.all([
    prisma.tenant.findMany({
      where: { ...where, collectionScore: { gte: 60 } },
      include: { unit: { include: { building: { select: { address: true } } } }, legalCase: { select: { stage: true } } },
      orderBy: { collectionScore: "desc" },
      take: 20,
    }),
    prisma.tenantNote.findMany({
      where: { tenant: where },
      include: { tenant: { select: { name: true } }, author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.payment.findMany({
      where: { tenant: where },
      include: { tenant: { select: { name: true } }, recorder: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.legalCase.findMany({
      where: { inLegal: true, tenant: where },
      include: { tenant: { select: { name: true, balance: true }, include: { unit: { select: { unitNumber: true, building: { select: { address: true } } } } } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const expiringLeases = await prisma.tenant.findMany({
    where: { ...where, leaseStatus: "expiring-soon" },
    include: { unit: { include: { building: { select: { address: true } } } } },
    orderBy: { leaseExpiration: "asc" },
    take: 10,
  });

  return NextResponse.json({
    urgentTenants: urgentTenants.map((t) => ({
      id: t.id,
      name: t.name,
      balance: Number(t.balance),
      collectionScore: t.collectionScore,
      building: t.unit.building.address,
      unit: t.unit.unitNumber,
      legalStage: t.legalCase?.stage,
    })),
    recentNotes,
    recentPayments,
    legalCases,
    expiringLeases: expiringLeases.map((t) => ({
      id: t.id,
      name: t.name,
      leaseExpiration: t.leaseExpiration,
      building: t.unit.building.address,
      unit: t.unit.unitNumber,
    })),
  });
});
