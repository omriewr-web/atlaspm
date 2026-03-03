import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { maintenanceScheduleSchema } from "@/lib/validations";

export const GET = withAuth(async (req, { user }) => {
  const where: any = {};
  if (user.role !== "ADMIN" && user.assignedProperties?.length) {
    where.buildingId = { in: user.assignedProperties };
  }

  const schedules = await prisma.maintenanceSchedule.findMany({
    where,
    include: {
      building: { select: { address: true } },
      unit: { select: { unitNumber: true } },
    },
    orderBy: { nextDueDate: "asc" },
  });

  return NextResponse.json(schedules);
}, "maintenance");

export const POST = withAuth(async (req) => {
  const data = await parseBody(req, maintenanceScheduleSchema);

  const schedule = await prisma.maintenanceSchedule.create({
    data: {
      title: data.title,
      description: data.description,
      frequency: data.frequency as any,
      nextDueDate: new Date(data.nextDueDate),
      autoCreateWorkOrder: data.autoCreateWorkOrder,
      buildingId: data.buildingId,
      unitId: data.unitId || null,
    },
    include: {
      building: { select: { address: true } },
      unit: { select: { unitNumber: true } },
    },
  });

  return NextResponse.json(schedule, { status: 201 });
}, "maintenance");
