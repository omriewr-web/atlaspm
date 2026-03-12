import { NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { canAccessBuilding } from "@/lib/data-scope";
import { getTurnover, updateTurnover } from "@/lib/services/turnover.service";
import { turnoverUpdateSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

export const GET = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const turnover = await getTurnover(id);
  if (!turnover) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessBuilding(user, turnover.buildingId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(turnover);
}, "vac");

export const PATCH = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const turnover = await getTurnover(id);
  if (!turnover) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canAccessBuilding(user, turnover.buildingId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await parseBody(req, turnoverUpdateSchema);
  const updated = await updateTurnover(id, body);
  return NextResponse.json(updated);
}, "vac");
