import { NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { canAccessBuilding } from "@/lib/data-scope";
import { turnoverCreateSchema } from "@/lib/validations";
import { listTurnovers, createTurnover } from "@/lib/services/turnover.service";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req, { user }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const buildingId = url.searchParams.get("buildingId") || undefined;
  const data = await listTurnovers(user, { status, buildingId });
  return NextResponse.json(data);
}, "vac");

export const POST = withAuth(async (req, { user }) => {
  const { unitId, buildingId, moveOutDate, moveOutSource, assignedToUserId } = await parseBody(req, turnoverCreateSchema);

  if (!(await canAccessBuilding(user, buildingId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const turnover = await createTurnover({
    unitId,
    buildingId,
    triggeredBy: "MANUAL",
    moveOutDate,
    moveOutSource,
    assignedToUserId,
  });
  return NextResponse.json(turnover, { status: 201 });
}, "vac");
