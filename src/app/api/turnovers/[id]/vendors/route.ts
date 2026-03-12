import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { canAccessBuilding } from "@/lib/data-scope";
import { getTurnover, addVendorAssignment } from "@/lib/services/turnover.service";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const turnover = await getTurnover(id);
  if (!turnover) return NextResponse.json({ error: "Turnover not found" }, { status: 404 });
  if (!canAccessBuilding(user, turnover.buildingId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  if (!body.vendorName || !body.trade) {
    return NextResponse.json({ error: "vendorName and trade are required" }, { status: 400 });
  }

  const assignment = await addVendorAssignment(id, body);
  return NextResponse.json(assignment, { status: 201 });
}, "vac");
