import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

export const GET = withAuth(async (req, { params }) => {
  const { id } = await params;
  const building = await prisma.building.findUnique({
    where: { id },
    include: {
      units: {
        include: {
          tenant: true,
          vacancyInfo: true,
        },
      },
    },
  });

  if (!building) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(building);
});

export const PATCH = withAuth(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const building = await prisma.building.update({ where: { id }, data: body });
  return NextResponse.json(building);
}, "edit");

export const DELETE = withAuth(async (req, { params }) => {
  const { id } = await params;
  await prisma.building.delete({ where: { id } });
  return NextResponse.json({ success: true });
}, "upload");
