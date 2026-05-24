import { unlink } from "fs/promises";
import { AnalysisArtifactModel } from "../../models/AnalysisArtifact";
import { env } from "../../config/env";

export const cleanupExpiredArtifacts = async () => {
  if (!env.artifacts.cleanupEnabled) {
    return;
  }

  const expiredArtifacts = await AnalysisArtifactModel.find({
    expiresAt: { $lte: new Date() },
  })
    .limit(200)
    .lean();

  for (const artifact of expiredArtifacts) {
    try {
      await unlink(artifact.absolutePath);
    } catch {
      // Ignore missing files and continue metadata cleanup.
    }

    await AnalysisArtifactModel.deleteOne({ artifactId: artifact.artifactId });
  }
};

export const initializeArtifactRetention = () => {
  if (!env.artifacts.cleanupEnabled) {
    return;
  }

  void cleanupExpiredArtifacts();
  setInterval(() => {
    void cleanupExpiredArtifacts();
  }, env.artifacts.cleanupIntervalMs);
};
