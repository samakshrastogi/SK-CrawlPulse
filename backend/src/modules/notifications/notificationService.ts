import { randomUUID } from "crypto";
import type { Response } from "express";
import { env } from "../../config/env";
import { NotificationModel } from "../../models/Notification";
import type { AnalysisRunView } from "../../types/platform";
import { escapeHtml, sendEmail } from "../mail/resendMailer";
import { publishNotificationEvent, subscribeToNotificationEvents } from "./notificationEvents";

export type NotificationKind =
  | "analysis_queued"
  | "analysis_running"
  | "analysis_checkpoint"
  | "analysis_completed"
  | "analysis_failed"
  | "analysis_critical"
  | "analysis_regression"
  | "analysis_security"
  | "analysis_retry"
  | "auth";

export type NotificationView = {
  notificationId: string;
  recipientEmail: string;
  recipientName?: string;
  kind: NotificationKind;
  title: string;
  message: string;
  runId?: string;
  targetUrl?: string;
  status?: string;
  readAt?: string;
  emailStatus: "pending" | "sent" | "failed" | "skipped";
  emailProviderId?: string;
  emailError?: string;
  createdAt: string;
  updatedAt: string;
};

type CreateNotificationInput = {
  recipientEmail?: string;
  recipientName?: string;
  kind: NotificationKind;
  title: string;
  message: string;
  runId?: string;
  targetUrl?: string;
  status?: string;
  sendMail?: boolean;
};

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const toView = (doc: any): NotificationView => ({
  notificationId: doc.notificationId,
  recipientEmail: doc.recipientEmail,
  recipientName: doc.recipientName ?? undefined,
  kind: doc.kind,
  title: doc.title,
  message: doc.message,
  runId: doc.runId ?? undefined,
  targetUrl: doc.targetUrl ?? undefined,
  status: doc.status ?? undefined,
  readAt: doc.readAt ? new Date(doc.readAt).toISOString() : undefined,
  emailStatus: doc.emailStatus,
  emailProviderId: doc.emailProviderId ?? undefined,
  emailError: doc.emailError ?? undefined,
  createdAt: new Date(doc.createdAt).toISOString(),
  updatedAt: new Date(doc.updatedAt).toISOString(),
});

const buildEmailHtml = (notification: Pick<NotificationView, "title" | "message" | "targetUrl" | "runId">) => `
  <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a">
    <p style="font-size:18px;font-weight:700;margin:0 0 12px">${escapeHtml(notification.title)}</p>
    <p>${escapeHtml(notification.message)}</p>
    ${
      notification.targetUrl
        ? `<p><strong>Target:</strong> ${escapeHtml(notification.targetUrl)}</p>`
        : ""
    }
    ${
      notification.runId
        ? `<p style="font-size:12px;color:#64748b">Run ID: ${escapeHtml(notification.runId)}</p>`
        : ""
    }
  </div>
`;

const sendSlackNotification = async (notification: Pick<NotificationView, "title" | "message" | "targetUrl" | "runId" | "kind">) => {
  if (!env.slack.webhookUrl) {
    return { skipped: true as const };
  }

  const text = [
    `*${notification.title}*`,
    notification.message,
    notification.targetUrl ? `Target: ${notification.targetUrl}` : "",
    notification.runId ? `Run ID: ${notification.runId}` : "",
  ].filter(Boolean).join("\n");

  const response = await fetch(env.slack.webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text,
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed with HTTP ${response.status}`);
  }

  return { skipped: false as const };
};

export const createNotification = async ({
  recipientEmail,
  recipientName,
  kind,
  title,
  message,
  runId,
  targetUrl,
  status,
  sendMail = true,
}: CreateNotificationInput) => {
  const normalizedEmail = normalizeEmail(recipientEmail);
  if (!normalizedEmail) {
    return null;
  }

  const doc = await NotificationModel.create({
    notificationId: randomUUID(),
    recipientEmail: normalizedEmail,
    recipientName,
    kind,
    title,
    message,
    runId,
    targetUrl,
    status,
    emailStatus: sendMail ? "pending" : "skipped",
  });

  let view = toView(doc);
  publishNotificationEvent(view);

  if (!sendMail) {
    return view;
  }

  try {
    const result = await sendEmail({
      to: normalizedEmail,
      subject: title,
      text: [message, targetUrl ? `Target: ${targetUrl}` : "", runId ? `Run ID: ${runId}` : ""]
        .filter(Boolean)
        .join("\n"),
      html: buildEmailHtml({ title, message, targetUrl, runId }),
    });
    doc.emailStatus = result.skipped ? "skipped" : "sent";
    doc.emailProviderId = result.id;
  } catch (error) {
    doc.emailStatus = "failed";
    doc.emailError = error instanceof Error ? error.message : "Email delivery failed";
  }

  await doc.save();
  view = toView(doc);
  publishNotificationEvent(view);

  try {
    await sendSlackNotification({
      title,
      message,
      targetUrl,
      runId,
      kind,
    });
  } catch (error) {
    console.warn(`[notifications] slack delivery failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return view;
};

export const notifyAnalysisRun = async (
  run: AnalysisRunView,
  kind: NotificationKind,
  title: string,
  message: string,
) =>
  createNotification({
    recipientEmail: run.request.operator?.email,
    recipientName: run.request.operator?.name,
    kind,
    title,
    message,
    runId: run.runId,
    targetUrl: run.request.targetUrl,
    status: run.status,
  }).catch((error) => {
    console.warn(`[notifications] failed to create notification for run ${run.runId}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });

export const listNotifications = async (email: unknown) => {
  const recipientEmail = normalizeEmail(email);
  if (!recipientEmail) {
    return [];
  }

  const docs = await NotificationModel.find({ recipientEmail }).sort({ createdAt: -1 }).limit(80).lean();
  return docs.map(toView);
};

export const markNotificationRead = async (email: unknown, notificationId: string) => {
  const recipientEmail = normalizeEmail(email);
  if (!recipientEmail) {
    return null;
  }

  const doc = await NotificationModel.findOneAndUpdate(
    { recipientEmail, notificationId },
    { $set: { readAt: new Date() } },
    { returnDocument: "after" },
  );
  return doc ? toView(doc) : null;
};

export const markAllNotificationsRead = async (email: unknown) => {
  const recipientEmail = normalizeEmail(email);
  if (!recipientEmail) {
    return 0;
  }

  const result = await NotificationModel.updateMany(
    { recipientEmail, readAt: undefined },
    { $set: { readAt: new Date() } },
  );
  return result.modifiedCount;
};

export const streamNotifications = async (email: unknown, res: Response) => {
  const recipientEmail = normalizeEmail(email);
  if (!recipientEmail) {
    return false;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const write = (payload: NotificationView) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const unsubscribe = subscribeToNotificationEvents(recipientEmail, write);
  const heartbeat = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 15000);

  res.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });

  return true;
};
