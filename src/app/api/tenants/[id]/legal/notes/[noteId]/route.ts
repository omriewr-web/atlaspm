// Permission: "legal" — legal note deletion
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";
import { assertTenantAccess } from "@/lib/data-scope";

export const dynamic = "force-dynamic";

export const DELETE = withAuth(async (req, { user, params }) => {
  const { id, noteId } = await params;
  const denied = await assertTenantAccess(user, id);
  if (denied) return denied;

  // Verify note belongs to a legal case owned by this tenant
  const note = await prisma.legalNote.findUnique({
    where: { id: noteId },
    select: { legalCase: { select: { tenantId: true } } },
  });
  if (!note || note.legalCase.tenantId !== id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.legalNote.delete({ where: { id: noteId } });
  return NextResponse.json({ success: true });
}, "legal");
