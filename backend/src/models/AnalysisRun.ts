import mongoose, { Schema } from "mongoose";

const analysisRunSchema = new Schema(
  {
    runId: { type: String, required: true, unique: true, index: true },
    status: { type: String, required: true, index: true },
    targetDomain: { type: String, required: true, index: true },
    request: { type: Schema.Types.Mixed, required: true },
    parentRunId: { type: String, index: true },
    retryOfRunId: { type: String, index: true },
    progress: { type: Schema.Types.Mixed, required: true },
    result: { type: Schema.Types.Mixed },
    failureClusters: { type: [Schema.Types.Mixed], default: [] },
    error: { type: String },
    workerId: { type: String, index: true },
    leaseExpiresAt: { type: Date, index: true },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    expectedDurationSeconds: { type: Number },
  },
  {
    timestamps: true,
  },
);

analysisRunSchema.index({ status: 1, updatedAt: -1 });
analysisRunSchema.index({ targetDomain: 1, updatedAt: -1 });
analysisRunSchema.index({ targetDomain: 1, status: 1, updatedAt: -1 });
analysisRunSchema.index({ retryOfRunId: 1, updatedAt: -1 });
analysisRunSchema.index({ parentRunId: 1, updatedAt: -1 });

export const AnalysisRunModel =
  mongoose.models.AnalysisRun || mongoose.model("AnalysisRun", analysisRunSchema);
