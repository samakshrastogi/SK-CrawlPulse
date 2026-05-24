import mongoose, { Schema } from "mongoose";

const analysisInteractionSchema = new Schema(
  {
    runId: { type: String, required: true, index: true },
    targetDomain: { type: String, required: true, index: true },
    buttonId: { type: String, required: true },
    pageUrl: { type: String, required: true },
    result: { type: Schema.Types.Mixed, required: true },
  },
  {
    timestamps: true,
  },
);

analysisInteractionSchema.index({ runId: 1, buttonId: 1 }, { unique: true });
analysisInteractionSchema.index({ targetDomain: 1, createdAt: -1 });
analysisInteractionSchema.index({ runId: 1, pageUrl: 1, createdAt: 1 });

export const AnalysisInteractionModel =
  mongoose.models.AnalysisInteraction || mongoose.model("AnalysisInteraction", analysisInteractionSchema);
