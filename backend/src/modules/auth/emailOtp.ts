import crypto from "crypto";
import nodemailer from "nodemailer";
import { env } from "../../config/env";

type PendingEmailOtp = {
  email: string;
  name: string;
  otpHash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
};

type SendRegistrationOtpInput = {
  email: string;
  name: string;
};

const pendingOtps = new Map<string, PendingEmailOtp>();

const normalizeEmail = (value: unknown) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const hashOtp = (otp: string, salt: string) => crypto.createHash("sha256").update(`${salt}:${otp}`).digest("hex");

const createOtp = () => crypto.randomInt(100000, 1000000).toString();

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getTransport = () => {
  if (!env.mail.smtpHost) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.mail.smtpHost,
    port: env.mail.smtpPort,
    secure: env.mail.smtpSecure,
    auth:
      env.mail.smtpUser && env.mail.smtpPass
        ? {
            user: env.mail.smtpUser,
            pass: env.mail.smtpPass,
          }
        : undefined,
  });
};

const sendOtpEmail = async (email: string, name: string, otp: string) => {
  const transport = getTransport();
  const expiresIn = `${env.mail.otpTtlMinutes} minute${env.mail.otpTtlMinutes === 1 ? "" : "s"}`;
  const displayName = name || "there";

  if (!transport) {
    console.warn(`[auth] SMTP not configured. Registration OTP for ${email}: ${otp}`);
    return;
  }

  await transport.sendMail({
    from: env.mail.fromEmail,
    to: email,
    subject: "Your SK CrawlPulse verification code",
    text: [
      `Hi ${displayName},`,
      "",
      `Your SK CrawlPulse verification code is ${otp}.`,
      `This code expires in ${expiresIn}.`,
      "",
      "If you did not request this account, ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#0f172a">
        <p>Hi ${escapeHtml(displayName)},</p>
        <p>Your SK CrawlPulse verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${otp}</p>
        <p>This code expires in ${expiresIn}.</p>
        <p>If you did not request this account, ignore this email.</p>
      </div>
    `,
  });
};

export const requestRegistrationOtp = async ({ email, name }: SendRegistrationOtpInput) => {
  const normalizedEmail = normalizeEmail(email);
  const trimmedName = name.trim();
  if (!trimmedName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return { ok: false as const, reason: "Enter a valid name and email address." };
  }

  const existing = pendingOtps.get(normalizedEmail);
  const now = Date.now();
  if (existing && now - existing.lastSentAt < env.mail.otpResendSeconds * 1000) {
    const retryAfterSeconds = Math.ceil((env.mail.otpResendSeconds * 1000 - (now - existing.lastSentAt)) / 1000);
    return {
      ok: false as const,
      reason: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
    };
  }

  const otp = createOtp();
  const salt = crypto.randomBytes(16).toString("hex");
  pendingOtps.set(normalizedEmail, {
    email: normalizedEmail,
    name: trimmedName,
    otpHash: hashOtp(otp, salt),
    salt,
    expiresAt: now + env.mail.otpTtlMinutes * 60 * 1000,
    attempts: 0,
    lastSentAt: now,
  });

  await sendOtpEmail(normalizedEmail, trimmedName, otp);
  return { ok: true as const, expiresInMinutes: env.mail.otpTtlMinutes };
};

export const verifyRegistrationOtp = (email: unknown, otp: unknown) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = typeof otp === "string" ? otp.replace(/\D/g, "") : "";
  const pending = pendingOtps.get(normalizedEmail);

  if (!pending) {
    return { ok: false as const, reason: "Request a new verification code." };
  }

  if (Date.now() > pending.expiresAt) {
    pendingOtps.delete(normalizedEmail);
    return { ok: false as const, reason: "Verification code expired. Request a new one." };
  }

  if (pending.attempts >= 5) {
    pendingOtps.delete(normalizedEmail);
    return { ok: false as const, reason: "Too many incorrect attempts. Request a new code." };
  }

  pending.attempts += 1;
  const submittedHash = hashOtp(normalizedOtp, pending.salt);
  const expected = Buffer.from(pending.otpHash, "hex");
  const submitted = Buffer.from(submittedHash, "hex");
  const matches = expected.length === submitted.length && crypto.timingSafeEqual(expected, submitted);

  if (!matches) {
    return { ok: false as const, reason: "Invalid verification code." };
  }

  pendingOtps.delete(normalizedEmail);
  return {
    ok: true as const,
    email: pending.email,
    name: pending.name,
  };
};
