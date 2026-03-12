import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { maintenanceScheduleSchema } from "@/lib/validations";
import { assertBuildingAccess } from "@/lib/data-scope";

export const dynamic = "force-dynamic";

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = await params;

  const existing = await prisma.maintenanceSchedule.findUnique({
    where: { id },
    select: { id: true, buildingId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify user has access to the schedule's building
  const denied = await assertBuildingAccess(user, existing.buildingId);
  if (denied) return denied;

  const data = await parseBody(req, maintenanceScheduleSchema.partial());

  const updateData: any = { ...data };
  if (data.nextDueDate) {
    updateData.nextDueDate = new Date(data.nextDueDate);
  }

  const schedule = await prisma.maintenanceSchedule.update({
    where: { id },
    data: updateData,
    include: {
      building: { select: { address: true } },
      unit: { select: { unitNumber: true } },
    },
  });

  return NextResponse.json(schedule);
}, "maintenance");

export const DELETE = withAuth(async (req, { user, params }) => {
  const { id } = await params;

  const existing = await prisma.maintenanceSchedule.findUnique({
    where: { id },
    select: { id: true, buildingId: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Verify user has access to the schedule's building
  const denied = await assertBuildingAccess(user, existing.buildingId);
  if (denied) return denied;

  await prisma.maintenanceSchedule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}, "maintenance");
