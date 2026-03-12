import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

// GET /api/organizations — SUPER_ADMIN only, list all orgs with counts
export const GET = withAuth(async (req, { user }) => {
  if ((user.role as UserRole) !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      isActive: true,
      _count: {
        select: {
          users: true,
          buildings: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan,
      isActive: o.isActive,
      userCount: o._count.users,
      buildingCount: o._count.buildings,
    }))
  );
}, "orgs");
