// Public endpoint — tenant-facing work order request portal.
// Excluded from auth middleware intentionally so tenants can submit
// maintenance requests without an AtlasPM account.
// Protected by: building token (GET) + rate limiting (5 requests/IP/hour) + honeypot field (POST).

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tenantRequestSchema } from "@/lib/validations";

// ── In-memory rate limiter (edge-compatible, resets on deploy) ───
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodic cleanup to prevent unbounded memory growth
let lastCleanup = Date.now();
function cleanupStaleEntries() {
  const now = Date.now();
  if (now - lastCleanup < 10 * 60 * 1000) return; // clean every 10 min
  lastCleanup = now;
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  try {
    cleanupStaleEntries();

    const ip = getClientIp(req);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const body = await req.json();

    // Honeypot: if a hidden "website" field is filled in, it's a bot
    if (body.website) {
      // Silently accept to not tip off bots, but don't create anything
      return NextResponse.json({ success: true, id: "ok" }, { status: 201 });
    }

    const data = tenantRequestSchema.parse(body);

    // Verify building token matches
    const building = await prisma.building.findUnique({
      where: { id: data.buildingId },
      select: { publicAccessToken: true },
    });
    if (!building || !building.publicAccessToken || building.publicAccessToken !== data.token) {
      return NextResponse.json({ error: "Invalid building token" }, { status: 403 });
    }

    const wo = await prisma.workOrder.create({
      data: {
        title: data.title,
        description: `${data.description}\n\n---\nSubmitted by: ${data.tenantName}\nContact: ${data.tenantContact}`,
        status: "PENDING_REVIEW",
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

// Public GET to fetch a single building's units for the request form.
// Requires a valid building token to prevent enumeration of all buildings.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const building = await prisma.building.findUnique({
    where: { publicAccessToken: token },
    select: {
      id: true,
      address: true,
      units: { select: { id: true, unitNumber: true }, orderBy: { unitNumber: "asc" } },
    },
  });

  if (!building) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  return NextResponse.json([building]);
}
