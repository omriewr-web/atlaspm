import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { assignBuildingsSchema } from "@/lib/validations";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

const ADMIN_ROLES: UserRole[] = ["SUPER_ADMIN", "ADMIN", "ACCOUNT_ADMIN"];

export const PATCH = withAuth(async (req, { user, params }) => {
  if (!ADMIN_ROLES.includes(user.role as UserRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { buildingIds } = await parseBody(req, assignBuildingsSchema);

  // Verify target user belongs to same org (unless SUPER_ADMIN)
  if (user.role !== "SUPER_ADMIN") {
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!targetUser || targetUser.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  // Verify all buildings belong to the same org
  if (buildingIds.length > 0) {
    const buildings = await prisma.building.findMany({
      where: { id: { in: buildingIds } },
      select: { organizationId: true },
    });

    const foreignBuildings = buildings.filter(
      (b) => b.organizationId !== user.organizationId && user.role !== "SUPER_ADMIN"
    );
    if (foreignBuildings.length > 0) {
      return NextResponse.json(
        { error: "Cannot assign buildings from another organization" },
        { status: 403 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userProperty.deleteMany({ where: { userId: id } });
    if (buildingIds.length > 0) {
      await tx.userProperty.createMany({
        data: buildingIds.map((buildingId: string) => ({ userId: id, buildingId })),
        skipDuplicates: true,
      });
    }
  });

  return NextResponse.json({ success: true, assigned: buildingIds.length });
}, "users");
