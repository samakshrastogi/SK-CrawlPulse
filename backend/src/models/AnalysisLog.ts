import mongoose, { Schema } from "mongoose";

const analysisLogSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    targetDomain: { type: String, required: true, index: true },
    level: { type: String, required: true, index: true },
    scope: { type: String, required: true, index: true },
    message: { type: String, required: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },
  },
  {
    timestamps: false,
  },
);

analysisLogSchema.index({ runId: 1, timestamp: 1 });
analysisLogSchema.index({ targetDomain: 1, timestamp: -1 });

export const AnalysisLogModel =
  mongoose.models.AnalysisLog || mongoose.model("AnalysisLog", analysisLogSchema);
