import { NextRequest, NextResponse } from "next/server";
import { withCronAuth } from "@/lib/with-cron-auth";
import { runSignalScan } from "@/lib/signals/engine";

// GET /api/cron/signals — triggered by external scheduler (Vercel Cron, etc.)
// Secured by dedicated CRON_SECRET check via withCronAuth
export const GET = withCronAuth(async () => {
  try {
    const result = await runSignalScan("scheduled");
    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
});
