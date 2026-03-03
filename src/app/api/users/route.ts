import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { userCreateSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export const GET = withAuth(async () => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, username: true, role: true, active: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}, "users");

export const POST = withAuth(async (req) => {
  const data = await parseBody(req, userCreateSchema);
  const hash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      name: data.name,
      username: data.username,
      passwordHash: hash,
      role: data.role as any,
    },
    select: { id: true, email: true, name: true, username: true, role: true, active: true },
  });

  return NextResponse.json(user, { status: 201 });
}, "users");
