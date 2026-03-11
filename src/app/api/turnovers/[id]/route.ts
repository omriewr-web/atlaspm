import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-helpers";
import { canAccessBuilding } from "@/lib/data-scope";
import { getTurnover, updateTurnover } from "@/lib/services/turnover.service";

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

  const body = await req.json();
  const updated = await updateTurnover(id, body);
  return NextResponse.json(updated);
}, "vac");
