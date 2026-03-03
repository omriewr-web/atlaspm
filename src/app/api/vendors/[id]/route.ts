import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { vendorUpdateSchema } from "@/lib/validations";

export const PATCH = withAuth(async (req, { params }) => {
  const { id } = await params;
  const data = await parseBody(req, vendorUpdateSchema);
  const vendor = await prisma.vendor.update({ where: { id }, data: data as any });
  return NextResponse.json(vendor);
}, "maintenance");

export const DELETE = withAuth(async (req, { params }) => {
  const { id } = await params;
  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ success: true });
}, "maintenance");
