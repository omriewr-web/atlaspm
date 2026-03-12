import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { vendorUpdateSchema } from "@/lib/validations";
import { getOrgScope } from "@/lib/data-scope";

export const dynamic = "force-dynamic";

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const orgScope = getOrgScope(user);

  // Verify vendor belongs to user's org before updating
  const vendor = await prisma.vendor.findFirst({ where: { id, ...orgScope } });
  if (!vendor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = await parseBody(req, vendorUpdateSchema);
  const updated = await prisma.vendor.update({ where: { id }, data: data as any });
  return NextResponse.json(updated);
}, "maintenance");

export const DELETE = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const orgScope = getOrgScope(user);

  // Verify vendor belongs to user's org before deleting
  const vendor = await prisma.vendor.findFirst({ where: { id, ...orgScope } });
  if (!vendor) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}, "maintenance");
