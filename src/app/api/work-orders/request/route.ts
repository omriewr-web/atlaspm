import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tenantRequestSchema } from "@/lib/validations";

// Public endpoint — no auth required
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = tenantRequestSchema.parse(body);

    const wo = await prisma.workOrder.create({
      data: {
        title: data.title,
        description: `${data.description}\n\n---\nSubmitted by: ${data.tenantName}\nContact: ${data.tenantContact}`,
        status: "OPEN",
        priority: data.priority as any,
        category: data.category as any,
        photos: data.photos ?? undefined,
        buildingId: data.buildingId,
        unitId: data.unitId || null,
      },
    });

    return NextResponse.json({ success: true, id: wo.id }, { status: 201 });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Request portal error:", error);
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}

// Public GET to fetch buildings for the request form
export async function GET() {
  const buildings = await prisma.building.findMany({
    select: {
      id: true,
      address: true,
      units: { select: { id: true, unitNumber: true }, orderBy: { unitNumber: "asc" } },
    },
    orderBy: { address: "asc" },
  });
  return NextResponse.json(buildings);
}
