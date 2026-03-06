import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { LegalStage } from "@prisma/client";

const STAGE_MAP: Record<string, LegalStage> = {
  "notice sent": "NOTICE_SENT", "notice": "NOTICE_SENT",
  "holdover": "HOLDOVER", "nonpayment": "NONPAYMENT",
  "non-payment": "NONPAYMENT", "court date": "COURT_DATE",
  "court": "COURT_DATE", "stipulation": "STIPULATION",
  "judgment": "JUDGMENT", "judgement": "JUDGMENT",
  "warrant": "WARRANT", "eviction": "EVICTION", "settled": "SETTLED",
};

function parseStage(value: string | undefined | null): LegalStage {
  if (!value) return "NONPAYMENT";
  return STAGE_MAP[value.toLowerCase().replace(/[_-]/g, " ").trim()] || "NONPAYMENT";
}

// GET — List pending review items
export const GET = withAuth(async (req: NextRequest) => {
  const items = await prisma.legalImportQueue.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ items });
}, "legal");

// POST — Resolve a review item (approve with tenant assignment, or reject)
export const POST = withAuth(async (req: NextRequest, { user }) => {
  const body = await req.json();
  const { queueId, action, tenantId } = body as {
    queueId: string;
    action: "approve" | "reject";
    tenantId?: string;
  };

  if (!queueId || !action) {
    return NextResponse.json({ error: "queueId and action required" }, { status: 400 });
  }

  const item = await prisma.legalImportQueue.findUnique({ where: { id: queueId } });
  if (!item) {
    return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  }

  if (action === "reject") {
    await prisma.legalImportQueue.update({
      where: { id: queueId },
      data: { status: "rejected", resolvedById: user.id, resolvedAt: new Date() },
    });
    return NextResponse.json({ status: "rejected" });
  }

  // Approve — need tenantId
  const targetTenantId = tenantId || item.candidateTenantId;
  if (!targetTenantId) {
    return NextResponse.json({ error: "tenantId required to approve" }, { status: 400 });
  }

  const rawData = item.rawData as any;
  const stage = parseStage(rawData.legalStage);

  await prisma.legalCase.upsert({
    where: { tenantId: targetTenantId },
    create: {
      tenantId: targetTenantId,
      inLegal: true,
      stage,
      caseNumber: rawData.caseNumber || null,
      attorney: rawData.attorney || null,
      filedDate: rawData.filingDate ? new Date(rawData.filingDate) : null,
      courtDate: rawData.courtDate ? new Date(rawData.courtDate) : null,
      arrearsBalance: rawData.arrearsBalance || null,
      status: rawData.status || "active",
      importBatchId: item.importBatchId,
    },
    update: {
      inLegal: true,
      stage,
      ...(rawData.caseNumber ? { caseNumber: rawData.caseNumber } : {}),
      ...(rawData.attorney ? { attorney: rawData.attorney } : {}),
      ...(rawData.filingDate ? { filedDate: new Date(rawData.filingDate) } : {}),
      ...(rawData.courtDate ? { courtDate: new Date(rawData.courtDate) } : {}),
      ...(rawData.arrearsBalance ? { arrearsBalance: rawData.arrearsBalance } : {}),
      importBatchId: item.importBatchId,
    },
  });

  if (rawData.notes) {
    const legalCase = await prisma.legalCase.findUnique({ where: { tenantId: targetTenantId } });
    if (legalCase) {
      await prisma.legalNote.create({
        data: {
          legalCaseId: legalCase.id,
          authorId: user.id,
          text: `[Import - Manual Review] ${rawData.notes}`,
          stage,
        },
      });
    }
  }

  await prisma.legalImportQueue.update({
    where: { id: queueId },
    data: { status: "approved", resolvedById: user.id, resolvedAt: new Date() },
  });

  return NextResponse.json({ status: "approved", tenantId: targetTenantId });
}, "legal");
