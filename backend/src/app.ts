import path from "path";
import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { analysisRouter } from "./routes/analysis";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

const app = express();

app.use(
  cors({
    origin: env.runtime.corsOrigin === "*" ? true : env.runtime.corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));
app.use("/artifacts", express.static(path.resolve(process.cwd(), env.runtime.artifactsDir)));

app.get("/health", (_req, res) => {
  res.json({
    service: "sk-crawlpulse",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/analysis", analysisRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
