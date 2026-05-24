import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { initializeArtifactRetention } from "./modules/platform/artifactRetention";
import { initializeAnalysisWorker } from "./modules/platform/analysisService";

const startServer = async () => {
  await connectDB();
  initializeAnalysisWorker();
  initializeArtifactRetention();

  app.listen(env.runtime.port, () => {
console.log(`SK CrawlPulse API listening on port ${env.runtime.port}`);
  });
};

void startServer();
