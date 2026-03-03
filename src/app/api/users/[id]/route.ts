import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { userUpdateSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export const PATCH = withAuth(async (req, { params }) => {
  const { id } = await params;
  const data = await parseBody(req, userUpdateSchema);
  const updateData: any = { ...data };

  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
    delete updateData.password;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: { id: true, email: true, name: true, username: true, role: true, active: true },
  });

  return NextResponse.json(user);
}, "users");

export const DELETE = withAuth(async (req, { params }) => {
  const { id } = await params;
  await prisma.user.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ success: true });
}, "users");
