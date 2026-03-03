import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { buildingCreateSchema } from "@/lib/validations";

export const GET = withAuth(async (req, { user }) => {
  const where: any = {};
  if (user.role !== "ADMIN" && user.assignedProperties?.length) {
    where.id = { in: user.assignedProperties };
  }

  const buildings = await prisma.building.findMany({
    where,
    include: {
      units: {
        include: {
          tenant: { select: { id: true, balance: true, marketRent: true } },
        },
      },
      _count: { select: { units: true } },
    },
    orderBy: { address: "asc" },
  });

  const result = buildings.map((b) => {
    const occupied = b.units.filter((u) => !u.isVacant).length;
    const vacant = b.units.filter((u) => u.isVacant).length;
    const totalMarketRent = b.units.reduce((sum, u) => sum + Number(u.tenant?.marketRent ?? 0), 0);
    const totalBalance = b.units.reduce((sum, u) => sum + Number(u.tenant?.balance ?? 0), 0);

    return {
      id: b.id,
      yardiId: b.yardiId,
      address: b.address,
      altAddress: b.altAddress,
      entity: b.entity,
      portfolio: b.portfolio,
      region: b.region,
      zip: b.zip,
      type: b.type,
      owner: b.owner,
      manager: b.manager,
      totalUnits: b._count.units,
      occupied,
      vacant,
      totalMarketRent,
      totalBalance,
      legalCaseCount: 0,
    };
  });

  return NextResponse.json(result);
});

export const POST = withAuth(async (req, { user }) => {
  const data = await parseBody(req, buildingCreateSchema);
  const building = await prisma.building.create({ data });
  return NextResponse.json(building, { status: 201 });
}, "upload");
