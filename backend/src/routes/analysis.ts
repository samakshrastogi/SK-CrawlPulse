import { Router } from "express";
import { HttpError } from "../lib/HttpError";
import {
  continueAnalysisCheckpoint,
  getPlatformAnalysisRun,
  listPlatformAnalysisRuns,
  retryPlatformAnalysis,
  startLoginSessionAnalysis,
  startPlatformAnalysis,
  streamPlatformAnalysisRun,
} from "../modules/platform/analysisService";
import type { AnalysisRequest, LoginPromptAction } from "../types/platform";

export const analysisRouter = Router();

analysisRouter.post("/run", async (req, res, next) => {
  try {
    const payload = req.body as AnalysisRequest;

    if (!payload?.targetUrl) {
      throw new HttpError(400, "targetUrl is required");
    }

    const result = await startPlatformAnalysis(payload);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

analysisRouter.get("/runs/:runId/stream", async (req, res, next) => {
  try {
    const started = await streamPlatformAnalysisRun(req.params.runId, res);
    if (!started) {
      throw new HttpError(404, "run not found");
    }
  } catch (error) {
    next(error);
  }
});

analysisRouter.post("/runs/:runId/checkpoint/continue", async (req, res, next) => {
  try {
    const requestedAction = req.body?.action;
    const action: LoginPromptAction =
      requestedAction === "continue_without_login" ? "continue_without_login" : "continue_after_login";
    const resumed = await continueAnalysisCheckpoint(req.params.runId, action);
    if (!resumed) {
      throw new HttpError(409, "checkpoint is not waiting");
    }

    res.status(202).json({ runId: req.params.runId, resumed: true, action });
  } catch (error) {
    next(error);
  }
});

analysisRouter.post("/runs/:runId/checkpoint/login-run", async (req, res, next) => {
  try {
    const result = await startLoginSessionAnalysis(req.params.runId);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

analysisRouter.post("/runs/:runId/retry", async (req, res, next) => {
  try {
    const result = await retryPlatformAnalysis(req.params.runId);
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

analysisRouter.get("/runs/:runId", async (req, res, next) => {
  try {
    const result = await getPlatformAnalysisRun(req.params.runId);
    if (!result) {
      throw new HttpError(404, "run not found");
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

analysisRouter.get("/runs", async (_req, res, next) => {
  try {
    const result = await listPlatformAnalysisRuns();
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
