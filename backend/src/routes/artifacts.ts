import { Router } from "express";
import { AnalysisArtifactModel } from "../models/AnalysisArtifact";
import { getAnalysisRun } from "../modules/platform/runStore";
import { env } from "../config/env";
import { normalizeUserEmail } from "../utils/userScope";

export const artifactRouter = Router();

artifactRouter.use(async (req, res, next) => {
  try {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.status(405).json({ error: "method not allowed" });
      return;
    }

    const ownerEmail = normalizeUserEmail(req.query.email ?? req.headers["x-user-email"]);
    if (!ownerEmail) {
      res.status(401).json({ error: "A valid user email is required" });
      return;
    }

    const publicUrl = `${env.runtime.artifactsPublicRoute}${req.path}`;
    const artifact = await AnalysisArtifactModel.findOne({ publicUrl }).lean();
    if (!artifact) {
      res.status(404).json({ error: "artifact not found" });
      return;
    }

    const run = await getAnalysisRun(artifact.runId, ownerEmail);
    if (!run) {
      res.status(404).json({ error: "artifact not found" });
      return;
    }

    res.sendFile(artifact.absolutePath);
  } catch (error) {
    next(error);
  }
});

