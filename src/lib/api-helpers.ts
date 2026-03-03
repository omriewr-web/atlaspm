import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { hasPermission, UserRole } from "@/types";

type ApiHandler = (req: NextRequest, ctx: { user: any; params?: any }) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler, perm?: string) {
  return async (req: NextRequest, context?: { params?: any }) => {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (perm && !hasPermission(session.user.role as UserRole, perm)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return await handler(req, { user: session.user, params: context?.params });
    } catch (error: any) {
      console.error("API Error:", error);
      return NextResponse.json(
        { error: error.message || "Internal server error" },
        { status: error.status || 500 }
      );
    }
  };
}

export async function parseBody<T>(req: NextRequest, schema: { parse: (v: unknown) => T }): Promise<T> {
  const body = await req.json();
  return schema.parse(body);
}

export function buildWhereClause(user: any, buildingId?: string | null) {
  const where: any = {};

  if (buildingId) {
    where.unit = { buildingId };
  } else if (user.role !== "ADMIN" && user.assignedProperties?.length) {
    where.unit = { buildingId: { in: user.assignedProperties } };
  }

  return where;
}
