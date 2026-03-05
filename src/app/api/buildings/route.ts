import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { buildingCreateSchema } from "@/lib/validations";
import { getBuildingIdScope, EMPTY_SCOPE } from "@/lib/data-scope";

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const portfolio = url.searchParams.get("portfolio");

  const scope = getBuildingIdScope(user);
  if (scope === EMPTY_SCOPE) return NextResponse.json([]);

  const where: any = { ...scope };
  if (portfolio) where.portfolio = portfolio;

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

    // Prefer altAddress (actual street address) over entity-style address field
    const displayAddress = (b.altAddress && b.altAddress.trim()) ? b.altAddress : b.address;

    return {
      id: b.id,
      yardiId: b.yardiId,
      address: displayAddress,
      altAddress: b.altAddress,
      entity: b.entity,
      portfolio: b.portfolio,
      region: b.region,
      zip: b.zip,
      block: b.block,
      lot: b.lot,
      type: b.type,
      owner: b.owner,
      ownerEmail: b.ownerEmail,
      manager: b.manager,
      arTeam: b.arTeam,
      apTeam: b.apTeam,
      headPortfolio: b.headPortfolio,
      mgmtStartDate: b.mgmtStartDate,
      einNumber: b.einNumber,
      bin: b.bin,
      mdrNumber: b.mdrNumber,
      dhcrRegId: b.dhcrRegId,
      squareFootage: b.squareFootage,
      yearBuilt: b.yearBuilt,
      constructionType: b.constructionType,
      floors: b.floors,
      floorsBelowGround: b.floorsBelowGround,
      lifeSafety: b.lifeSafety,
      elevatorInfo: b.elevatorInfo,
      boilerInfo: b.boilerInfo,
      complianceDates: b.complianceDates,
      superintendent: b.superintendent,
      elevatorCompany: b.elevatorCompany,
      fireAlarmCompany: b.fireAlarmCompany,
      utilityMeters: b.utilityMeters,
      utilityAccounts: b.utilityAccounts,
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

// Convert null JSON fields to Prisma.DbNull for proper storage
function sanitizeJsonFields(data: any) {
  const jsonFields = ["superintendent", "elevatorCompany", "fireAlarmCompany", "utilityMeters", "utilityAccounts", "lifeSafety", "elevatorInfo", "boilerInfo", "complianceDates"];
  const result = { ...data };
  for (const field of jsonFields) {
    if (result[field] === null) {
      result[field] = Prisma.DbNull;
    }
  }
  if (result.mgmtStartDate) {
    result.mgmtStartDate = new Date(result.mgmtStartDate);
  }
  return result;
}

export const POST = withAuth(async (req, { user }) => {
  const data = await parseBody(req, buildingCreateSchema);
  const building = await prisma.building.create({ data: sanitizeJsonFields(data) });
  return NextResponse.json(building, { status: 201 });
}, "upload");
