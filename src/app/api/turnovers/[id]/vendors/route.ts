import { NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { canAccessBuilding } from "@/lib/data-scope";
import { turnoverVendorCreateSchema } from "@/lib/validations";
import { getTurnover, addVendorAssignment } from "@/lib/services/turnover.service";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const turnover = await getTurnover(id);
  if (!turnover) return NextResponse.json({ error: "Turnover not found" }, { status: 404 });
  if (!(await canAccessBuilding(user, turnover.buildingId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await parseBody(req, turnoverVendorCreateSchema);
  const assignment = await addVendorAssignment(id, data);
  return NextResponse.json(assignment, { status: 201 });
}, "vac");
