import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { legalCaseSchema } from "@/lib/validations";

export const GET = withAuth(async (req, { params }) => {
  const { id } = await params;
  const legalCase = await prisma.legalCase.findUnique({
    where: { tenantId: id },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });
  return NextResponse.json(legalCase);
}, "legal");

export const POST = withAuth(async (req, { params }) => {
  const { id } = await params;
  const data = await parseBody(req, legalCaseSchema);

  const legalCase = await prisma.legalCase.upsert({
    where: { tenantId: id },
    create: {
      tenantId: id,
      inLegal: data.inLegal ?? true,
      stage: data.stage || "NOTICE_SENT",
      caseNumber: data.caseNumber,
      attorney: data.attorney,
      filedDate: data.filedDate ? new Date(data.filedDate) : null,
    },
    update: {
      inLegal: data.inLegal,
      stage: data.stage,
      caseNumber: data.caseNumber,
      attorney: data.attorney,
      filedDate: data.filedDate ? new Date(data.filedDate) : undefined,
    },
    include: {
      notes: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json(legalCase);
}, "legal");
