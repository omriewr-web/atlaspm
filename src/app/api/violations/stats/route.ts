import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import type { ViolationStats } from "@/types";

export const GET = withAuth(async (req: NextRequest, { user }) => {
  const url = new URL(req.url);
  const buildingId = url.searchParams.get("buildingId");

  const where: any = {};
  if (buildingId) {
    where.buildingId = buildingId;
  } else if (user.role !== "ADMIN" && user.assignedProperties?.length) {
    where.buildingId = { in: user.assignedProperties };
  }

  // Exclude dismissed/closed
  where.currentStatus = { notIn: ["CLOSE", "CLOSED", "DISMISSED"] };

  const [total, classA, classB, classC, penalties, hearings] = await Promise.all([
    prisma.violation.count({ where }),
    prisma.violation.count({ where: { ...where, class: "A" } }),
    prisma.violation.count({ where: { ...where, class: "B" } }),
    prisma.violation.count({ where: { ...where, class: "C" } }),
    prisma.violation.aggregate({ where, _sum: { penaltyAmount: true } }),
    prisma.violation.count({
      where: {
        ...where,
        hearingDate: { gte: new Date() },
      },
    }),
  ]);

  const stats: ViolationStats = {
    totalOpen: total,
    classACount: classA,
    classBCount: classB,
    classCCount: classC,
    totalPenalties: Number(penalties._sum.penaltyAmount || 0),
    upcomingHearings: hearings,
  };

  return NextResponse.json(stats);
}, "compliance");
