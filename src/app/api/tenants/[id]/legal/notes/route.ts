import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { legalNoteSchema } from "@/lib/validations";

export const POST = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const data = await parseBody(req, legalNoteSchema);

  const legalCase = await prisma.legalCase.findUnique({ where: { tenantId: id } });
  if (!legalCase) return NextResponse.json({ error: "No legal case found" }, { status: 404 });

  const note = await prisma.legalNote.create({
    data: {
      legalCaseId: legalCase.id,
      authorId: user.id,
      text: data.text,
      stage: data.stage,
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(note, { status: 201 });
}, "legal");
