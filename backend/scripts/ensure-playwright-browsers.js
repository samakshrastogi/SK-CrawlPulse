const { existsSync } = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");

const installChromium = () => {
  const cliPath = path.join(path.dirname(require.resolve("playwright/package.json")), "cli.js");
  const result = spawnSync(process.execPath, [cliPath, "install", "chromium"], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const executablePath = chromium.executablePath();

if (existsSync(executablePath)) {
  console.log(`[playwright] Chromium is available at ${executablePath}`);
  process.exit(0);
}

console.log(`[playwright] Chromium is missing at ${executablePath}. Installing browsers...`);
installChromium();

if (!existsSync(executablePath)) {
  console.error(`[playwright] Chromium install completed but executable is still missing at ${executablePath}`);
  process.exit(1);
}

console.log(`[playwright] Chromium installed at ${executablePath}`);
