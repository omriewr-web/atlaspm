import { NextRequest, NextResponse } from "next/server";
import { withAuth, parseBody } from "@/lib/api-helpers";
import { emailSendSchema } from "@/lib/validations";
import { assertTenantAccess } from "@/lib/data-scope";
import { sendEmail } from "@/lib/email-service";

export const dynamic = "force-dynamic";

export const POST = withAuth(async (req, { user }) => {
  const data = await parseBody(req, emailSendSchema);

  if (data.tenantId) {
    const forbidden = await assertTenantAccess(user, data.tenantId);
    if (forbidden) return forbidden;
  }

  const result = await sendEmail({
    to: data.recipientEmail,
    subject: data.subject,
    body: data.body,
    type: data.type,
    tenantId: data.tenantId,
    sentById: user.id,
  });

  return NextResponse.json({ success: true, id: result?.id });
}, "email");
