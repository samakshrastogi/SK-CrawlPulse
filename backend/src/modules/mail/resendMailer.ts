import { env } from "../../config/env";
import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
};

type ResendEmailResponse = {
  id?: string;
  message?: string;
  name?: string;
  error?: string;
};

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const sendEmail = async ({ to, subject, text, html }: SendEmailInput) => {
  if (env.mail.resendApiKey) {
    const response = await fetch(env.mail.resendEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.mail.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.mail.fromEmail,
        to,
        subject,
        text,
        html,
        reply_to: env.mail.replyToEmail,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as ResendEmailResponse;
    if (!response.ok) {
      throw new Error(payload.message ?? payload.error ?? payload.name ?? "Resend email request failed");
    }

    return { skipped: false as const, id: payload.id, provider: "resend" as const };
  }

  if (env.mail.smtpHost) {
    const transporter = nodemailer.createTransport({
      host: env.mail.smtpHost,
      port: env.mail.smtpPort,
      secure: env.mail.smtpSecure,
      auth: env.mail.smtpUser && env.mail.smtpPass
        ? {
            user: env.mail.smtpUser,
            pass: env.mail.smtpPass,
          }
        : undefined,
    });

    const result = await transporter.sendMail({
      from: env.mail.fromEmail,
      to,
      replyTo: env.mail.replyToEmail,
      subject,
      text,
      html,
    });

    return { skipped: false as const, id: result.messageId, provider: "smtp" as const };
  }

  console.warn(`[mail] RESEND_API_KEY/SMTP_HOST not configured. Skipping email "${subject}" to ${String(to)}.`);
  return { skipped: true as const, id: undefined, provider: undefined };
};
