import { NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { canAccessBuilding } from "@/lib/data-scope";
import { turnoverVendorUpdateSchema } from "@/lib/validations";
import { getTurnover, updateVendorAssignment } from "@/lib/services/turnover.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id, vendorAssignmentId } = await params;

  const turnover = await getTurnover(id);
  if (!turnover) return NextResponse.json({ error: "Turnover not found" }, { status: 404 });
  if (!(await canAccessBuilding(user, turnover.buildingId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify vendor assignment belongs to this turnover
  const assignment = await prisma.turnoverVendorAssignment.findUnique({
    where: { id: vendorAssignmentId },
  });
  if (!assignment || assignment.turnoverWorkflowId !== id) {
    return NextResponse.json({ error: "Vendor assignment not found" }, { status: 404 });
  }

  const data = await parseBody(req, turnoverVendorUpdateSchema);
  const updated = await updateVendorAssignment(vendorAssignmentId, data);
  return NextResponse.json(updated);
}, "vac");
