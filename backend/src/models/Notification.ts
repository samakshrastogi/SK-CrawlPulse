import mongoose, { Schema } from "mongoose";

const notificationSchema = new Schema(
  {
    notificationId: { type: String, required: true, unique: true, index: true },
    recipientEmail: { type: String, required: true, index: true },
    recipientName: { type: String },
    kind: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    runId: { type: String, index: true },
    targetUrl: { type: String },
    status: { type: String },
    readAt: { type: Date },
    emailStatus: { type: String, required: true, default: "pending", index: true },
    emailProviderId: { type: String },
    emailError: { type: String },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ recipientEmail: 1, createdAt: -1 });
notificationSchema.index({ recipientEmail: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ runId: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
