import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

export const PATCH = withAuth(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const unit = await prisma.unit.update({
    where: { id },
    data: {
      ...(body.unitNumber !== undefined && { unitNumber: body.unitNumber }),
      ...(body.unitType !== undefined && { unitType: body.unitType || null }),
      ...(body.isVacant !== undefined && { isVacant: body.isVacant }),
    },
  });
  return NextResponse.json(unit);
}, "edit");

export const DELETE = withAuth(async (req, { params }) => {
  const { id } = await params;
  await prisma.unit.delete({ where: { id } });
  return NextResponse.json({ success: true });
}, "edit");
