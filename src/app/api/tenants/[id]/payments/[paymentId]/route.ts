import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth } from "@/lib/api-helpers";

export const DELETE = withAuth(async (req, { params }) => {
  const { paymentId } = await params;
  await prisma.payment.delete({ where: { id: paymentId } });
  return NextResponse.json({ success: true });
}, "pay");
