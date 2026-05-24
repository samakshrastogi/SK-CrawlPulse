import dotenv from "dotenv";

dotenv.config();

const asNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return value === "true";
};

export const env = {
  runtime: {
    port: asNumber(process.env.PORT, 5000),
    nodeEnv: process.env.NODE_ENV ?? "development",
    artifactsDir: process.env.ARTIFACTS_DIR ?? "artifacts",
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
  },
  secrets: {
    mongoUri: process.env.MONGO_URI ?? "",
  },
  crawler: {
    headless: process.env.PLAYWRIGHT_HEADLESS !== "false",
    timeoutMs: asNumber(process.env.CRAWLER_TIMEOUT_MS, 20000),
    maxPages: asNumber(process.env.CRAWLER_MAX_PAGES, 50),
    maxLinksPerPage: asNumber(process.env.CRAWLER_MAX_LINKS_PER_PAGE, 80),
    maxDepth: asNumber(process.env.CRAWLER_MAX_DEPTH, 4),
    maxInteractionsPerPage: asNumber(process.env.CRAWLER_MAX_INTERACTIONS_PER_PAGE, 16),
    browserExecutablePath: process.env.BROWSER_EXECUTABLE_PATH,
  },
  artifacts: {
    retentionDays: asNumber(process.env.ARTIFACT_RETENTION_DAYS, 14),
    cleanupIntervalMs: asNumber(process.env.ARTIFACT_CLEANUP_INTERVAL_MS, 60 * 60 * 1000),
    cleanupEnabled: asBoolean(process.env.ARTIFACT_CLEANUP_ENABLED, true),
  },
};

export const publicRuntimeEnv = {
  port: env.runtime.port,
  nodeEnv: env.runtime.nodeEnv,
  artifactsDir: env.runtime.artifactsDir,
  corsOrigin: env.runtime.corsOrigin,
};
