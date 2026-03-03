import { Resend } from "resend";
import { prisma } from "./prisma";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY || "re_placeholder");
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  type: string;
  tenantId?: string;
  sentById: string;
}) {
  const resend = getResend();
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@example.com";
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  if (error) throw new Error(error.message);

  await prisma.emailLog.create({
    data: {
      tenantId: params.tenantId || null,
      sentById: params.sentById,
      type: params.type as any,
      subject: params.subject,
      body: params.body,
      recipientEmail: params.to,
      status: "sent",
    },
  });

  return data;
}
