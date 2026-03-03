import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { workOrderCommentSchema } from "@/lib/validations";

export const GET = withAuth(async (req, { params }) => {
  const { id } = await params;
  const comments = await prisma.workOrderComment.findMany({
    where: { workOrderId: id },
    include: { author: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(comments);
}, "maintenance");

export const POST = withAuth(async (req, { user, params }) => {
  const { id } = await params;
  const data = await parseBody(req, workOrderCommentSchema);

  const comment = await prisma.workOrderComment.create({
    data: {
      workOrderId: id,
      authorId: user.id,
      text: data.text,
      photos: data.photos ?? undefined,
    },
    include: { author: { select: { name: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}, "maintenance");
