import mongoose, { Schema } from "mongoose";

const analysisArtifactSchema = new Schema(
  {
    artifactId: { type: String, required: true, unique: true, index: true },
    runId: { type: String, required: true, index: true },
    targetDomain: { type: String, required: true, index: true },
    kind: { type: String, required: true, index: true },
    relatedPageUrl: { type: String },
    relatedInteractionId: { type: String, index: true },
    fileName: { type: String, required: true },
    absolutePath: { type: String, required: true },
    publicUrl: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now, index: true },
    expiresAt: { type: Date },
  },
  {
    timestamps: false,
  },
);

analysisArtifactSchema.index({ runId: 1, createdAt: 1 });
analysisArtifactSchema.index({ targetDomain: 1, createdAt: -1 });
analysisArtifactSchema.index({ expiresAt: 1 });

export const AnalysisArtifactModel =
  mongoose.models.AnalysisArtifact || mongoose.model("AnalysisArtifact", analysisArtifactSchema);
