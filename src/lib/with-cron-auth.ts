import { NextRequest, NextResponse } from "next/server";

type CronHandler = (req: NextRequest) => Promise<NextResponse | Response>;

/**
 * Dedicated auth wrapper for cron endpoints.
 * Only checks CRON_SECRET — no session, no role escalation.
 */
export function withCronAuth(handler: CronHandler) {
  return async (req: NextRequest) => {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req);
  };
}
