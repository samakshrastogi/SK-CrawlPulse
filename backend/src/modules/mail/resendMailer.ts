import { env } from "../../config/env";

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
  if (!env.mail.resendApiKey) {
    console.warn(`[mail] RESEND_API_KEY not configured. Skipping email "${subject}" to ${String(to)}.`);
    return { skipped: true as const, id: undefined };
  }

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

  return { skipped: false as const, id: payload.id };
};
