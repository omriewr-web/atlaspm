import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

export const DELETE = withAuth(async (req, { params }) => {
  const { noteId } = await params;
  await prisma.tenantNote.delete({ where: { id: noteId } });
  return NextResponse.json({ success: true });
}, "notes");
