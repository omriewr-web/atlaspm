import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { canAccessBuilding } from "@/lib/data-scope";
import { getTurnover, updateVendorAssignment } from "@/lib/services/turnover.service";
import { prisma } from "@/lib/prisma";

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id, vendorAssignmentId } = await params;

  const turnover = await getTurnover(id);
  if (!turnover) return NextResponse.json({ error: "Turnover not found" }, { status: 404 });
  if (!canAccessBuilding(user, turnover.buildingId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify vendor assignment belongs to this turnover
  const assignment = await prisma.turnoverVendorAssignment.findUnique({
    where: { id: vendorAssignmentId },
  });
  if (!assignment || assignment.turnoverWorkflowId !== id) {
    return NextResponse.json({ error: "Vendor assignment not found" }, { status: 404 });
  }

  const body = await req.json();
  const updated = await updateVendorAssignment(vendorAssignmentId, body);
  return NextResponse.json(updated);
}, "vac");
