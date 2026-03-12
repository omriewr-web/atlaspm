import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrgScope, EMPTY_SCOPE } from "@/lib/data-scope";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const buildingId = searchParams.get("buildingId") || undefined;
  const format = searchParams.get("format") || "csv";

  const user = session.user as any;
  const scope = getOrgScope(user);

  if (scope === EMPTY_SCOPE) {
    return new NextResponse("No data", { status: 204 });
  }

  const where = {
    ...scope,
    ...(buildingId ? { buildingId } : {}),
  };

  const tenants = await prisma.tenant.findMany({
    where,
    include: {
      unit: { include: { building: { select: { id: true, address: true, altAddress: true, region: true, entity: true, portfolio: true } } } },
      legalCases: { where: { isActive: true }, select: { inLegal: true, stage: true }, take: 1 },
      _count: { select: { notes: true, payments: true, tasks: true } },
    },
    orderBy: { balance: "desc" },
  });

  if (format === "csv") {
    const headers = [
      "Tenant Name", "Unit", "Building", "Balance", "Monthly Rent",
      "Lease Start", "Lease End", "Status", "In Legal", "Notes Count"
    ];
    const rows = tenants.map((t) => [
      t.name,
      t.unit?.unitNumber ?? "",
      t.unit?.building?.address ?? "",
      t.balance?.toString() ?? "0",
      t.monthlyRent?.toString() ?? "0",
      t.leaseStart ? new Date(t.leaseStart).toLocaleDateString() : "",
      t.leaseEnd ? new Date(t.leaseEnd).toLocaleDateString() : "",
      t.status ?? "",
      t.legalCases?.[0]?.inLegal ? "Yes" : "No",
      String(t._count?.notes ?? 0),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="tenants-export.csv"',
      },
    });
  }

  return NextResponse.json(tenants);
}
