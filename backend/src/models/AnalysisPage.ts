import mongoose, { Schema } from "mongoose";

const analysisPageSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    targetDomain: { type: String, required: true, index: true },
    url: { type: String, required: true },
    routePath: { type: String, required: true },
    depth: { type: Number, required: true, default: 0 },
    snapshot: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  },
);

analysisPageSchema.index({ runId: 1, url: 1 }, { unique: true });
analysisPageSchema.index({ targetDomain: 1, createdAt: -1 });

export const AnalysisPageModel =
  mongoose.models.AnalysisPage || mongoose.model("AnalysisPage", analysisPageSchema);
