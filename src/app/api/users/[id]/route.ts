import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { userUpdateSchema } from "@/lib/validations";
import { canCreateRole } from "@/lib/permissions";
import type { UserRole } from "@/types";
import bcrypt from "bcryptjs";

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const data = await parseBody(req, userUpdateSchema);

  // If changing role, enforce permissions
  if (data.role && !canCreateRole(user.role as UserRole, data.role as UserRole)) {
    return NextResponse.json(
      { error: `Your role cannot assign the ${data.role} role` },
      { status: 403 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updateData: any = { ...data };
    delete updateData.buildingIds;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
      delete updateData.password;
    }

    const updated = await tx.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, name: true, username: true, role: true, active: true },
    });

    // Update building assignments if provided
    if (data.buildingIds !== undefined) {
      await tx.userProperty.deleteMany({ where: { userId: id } });
      if (data.buildingIds && data.buildingIds.length > 0) {
        await tx.userProperty.createMany({
          data: data.buildingIds.map((buildingId) => ({
            userId: id,
            buildingId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
  });

  return NextResponse.json(result);
}, "users");

export const DELETE = withAuth(async (req, { params }) => {
  const { id } = await params;
  await prisma.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}, "users");
