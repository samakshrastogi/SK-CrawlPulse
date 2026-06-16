import path from "path";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { analysisRouter } from "./routes/analysis";
import { authRouter } from "./routes/auth";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();
const localhostOriginPattern = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/;
const configuredCorsOrigins = new Set(env.runtime.corsOrigins);
const allowAnyCorsOrigin = configuredCorsOrigins.has("*");
const allowLocalhostDevOrigins = env.runtime.nodeEnv === "development";

const resolveCorsOrigin = (
  requestOrigin: string | undefined,
  callback: (error: Error | null, allow?: boolean) => void,
) => {
  if (!requestOrigin || allowAnyCorsOrigin || configuredCorsOrigins.has(requestOrigin)) {
    callback(null, true);
    return;
  }

  if (allowLocalhostDevOrigins && localhostOriginPattern.test(requestOrigin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
};

app.use(
  cors({
    origin: resolveCorsOrigin,
    credentials: env.runtime.corsCredentials,
  }),
);
app.use(express.json({ limit: env.runtime.jsonBodyLimit }));
app.use(env.runtime.artifactsPublicRoute, express.static(path.resolve(process.cwd(), env.runtime.artifactsDir)));

app.get("/health", (_req, res) => {
  res.json({
    service: env.runtime.serviceName,
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use(env.runtime.analysisApiRoute, analysisRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
