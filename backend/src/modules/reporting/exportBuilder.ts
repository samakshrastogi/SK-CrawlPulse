import type { AnalysisRunView, GeneratedTestCase, RuntimeFinding } from "../../types/platform";

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toRoute = (value: string) => {
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value;
  }
};

const specName = (value: string) =>
  value
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .slice(0, 96)
    .replace(/'/g, "\\'");

const toSpecStepComment = (step: string) => `    // ${step.replace(/\r?\n/g, " ").slice(0, 180)}`;

const buildQualityGate = (run: AnalysisRunView) => {
  const result = run.result;
  if (!result) {
    return {
      passed: false,
      label: "No completed result",
      reasons: ["Quality gate requires a completed analysis result."],
    };
  }

  const highFindings = result.frontend.runtimeFindings.filter((finding) => finding.severity === "high").length;
  const failedInteractions = result.frontend.coverageReport.failed;
  const coverage = Number.parseInt(result.frontend.coverageReport.coverage, 10) || 0;
  const reasons: string[] = [];

  if (highFindings > 0) {
    reasons.push(`${highFindings} high-severity finding${highFindings === 1 ? "" : "s"} detected.`);
  }
  if (failedInteractions > 0) {
    reasons.push(`${failedInteractions} failed interaction check${failedInteractions === 1 ? "" : "s"} detected.`);
  }
  if (coverage < 80) {
    reasons.push(`Coverage is ${coverage}%, below the recommended 80% gate.`);
  }

  return {
    passed: reasons.length === 0,
    label: reasons.length === 0 ? "Passed" : "Needs review",
    reasons: reasons.length > 0 ? reasons : ["No high-severity findings, failed interactions, or low coverage gate failures."],
  };
};

const renderFinding = (finding: RuntimeFinding) => `
  <article class="card">
    <div class="meta">${escapeHtml(finding.severity)} / ${escapeHtml(finding.type)} / ${escapeHtml(toRoute(finding.pageUrl))}</div>
    <h3>${escapeHtml(finding.summary)}</h3>
    <p>${escapeHtml(finding.details)}</p>
    <ul>${finding.evidence.slice(0, 6).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </article>`;

const renderTest = (test: GeneratedTestCase) => `
  <article class="card">
    <div class="meta">${escapeHtml(test.priority)} / ${escapeHtml(test.category)} / ${escapeHtml(test.status ?? "PASS")}</div>
    <h3>${escapeHtml(test.title)}</h3>
    <p>${escapeHtml(test.description)}</p>
    <ol>${test.steps.slice(0, 8).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    <p><strong>Expected:</strong> ${escapeHtml(test.expectedResult)}</p>
  </article>`;

export const buildRunJsonExport = (run: AnalysisRunView) =>
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      run,
      qualityGate: buildQualityGate(run),
    },
    null,
    2,
  );

export const buildRunHtmlReport = (run: AnalysisRunView) => {
  const result = run.result;
  const gate = buildQualityGate(run);
  const findings = result?.frontend.runtimeFindings ?? [];
  const tests = result?.testCases ?? [];
  const report = result?.report;
  const coverage = result?.frontend.coverageReport;
  const coverageScore = result?.frontend.coverageScore;
  const securityFindings = result?.frontend.securityFindings ?? [];
  const rootCauseAnalyses = result?.frontend.rootCauseAnalyses ?? [];

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SK CrawlPulse Report - ${escapeHtml(run.runId)}</title>
  <style>
    :root { color-scheme: light; font-family: Inter, Segoe UI, Arial, sans-serif; color: #0f172a; background: #f8fafc; }
    body { margin: 0; padding: 32px; }
    main { max-width: 1120px; margin: 0 auto; display: grid; gap: 18px; }
    header, section { background: #fff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 22px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06); }
    h1, h2, h3 { margin: 0; }
    h1 { font-size: 30px; }
    h2 { font-size: 20px; margin-bottom: 12px; }
    h3 { font-size: 15px; margin-top: 8px; }
    p, li { line-height: 1.6; }
    .muted, .meta { color: #64748b; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
    .metric, .card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 14px; padding: 14px; }
    .metric strong { display: block; margin-top: 8px; font-size: 22px; color: #0f172a; }
    .gate-pass { color: #047857; }
    .gate-fail { color: #b91c1c; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #0f172a; color: #dbeafe; padding: 14px; border-radius: 14px; }
    @media print { body { padding: 0; background: #fff; } header, section { box-shadow: none; break-inside: avoid; } }
  </style>
</head>
<body>
  <main>
    <header>
      <p class="muted">SK CrawlPulse exported report</p>
      <h1>${escapeHtml(run.request.targetUrl)}</h1>
      <p class="muted">Run ${escapeHtml(run.runId)} / ${escapeHtml(run.status)} / started ${escapeHtml(run.startedAt)}</p>
    </header>

    <section>
      <h2>Quality Gate: <span class="${gate.passed ? "gate-pass" : "gate-fail"}">${escapeHtml(gate.label)}</span></h2>
      <ul>${gate.reasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>

    <section>
      <h2>Executive Summary</h2>
      <p>${escapeHtml(report?.overview.summary ?? "No completed report summary is available.")}</p>
      <div class="grid">
        <div class="metric">Pages<strong>${escapeHtml(result?.frontend.pages.length ?? run.pages.length)}</strong></div>
        <div class="metric">Interactions<strong>${escapeHtml(result?.frontend.interactionResults.length ?? run.interactions.length)}</strong></div>
        <div class="metric">Coverage<strong>${escapeHtml(coverage?.coverage ?? "0%")}</strong></div>
        <div class="metric">Findings<strong>${escapeHtml(findings.length)}</strong></div>
        <div class="metric">Coverage score<strong>${escapeHtml(coverageScore?.overallScore ?? 0)}</strong></div>
        <div class="metric">Security signals<strong>${escapeHtml(securityFindings.length)}</strong></div>
      </div>
    </section>

    <section>
      <h2>Top Findings</h2>
      ${findings.slice(0, 20).map(renderFinding).join("") || "<p class=\"muted\">No findings were generated.</p>"}
    </section>

    <section>
      <h2>Generated Test Cases</h2>
      ${tests.slice(0, 30).map(renderTest).join("") || "<p class=\"muted\">No generated test cases are available.</p>"}
    </section>

    <section>
      <h2>Root Cause Analysis</h2>
      ${
        rootCauseAnalyses.length > 0
          ? rootCauseAnalyses
              .slice(0, 20)
              .map(
                (analysis) => `
                  <article class="card">
                    <div class="meta">${escapeHtml(analysis.findingId)} / ${escapeHtml(analysis.confidenceScore)}%</div>
                    <h3>${escapeHtml(analysis.probableRootCause)}</h3>
                    <p><strong>Technical:</strong> ${escapeHtml(analysis.technicalExplanation)}</p>
                    <p><strong>Impact:</strong> ${escapeHtml(analysis.userImpact)}</p>
                    <p><strong>Fix:</strong> ${escapeHtml(analysis.suggestedFix)}</p>
                  </article>`,
              )
              .join("")
          : "<p class=\"muted\">No root cause analysis was generated.</p>"
      }
    </section>

    <section>
      <h2>Backend and API</h2>
      <ul>${(result?.backendValidation.observations ?? ["No backend observations are available."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </section>

    <section>
      <h2>Security Findings</h2>
      ${
        securityFindings.length > 0
          ? `<ul>${securityFindings.slice(0, 20).map((finding) => `<li>${escapeHtml(finding.riskLevel)} ${escapeHtml(finding.category)} - ${escapeHtml(finding.requestUrl)}</li>`).join("")}</ul>`
          : "<p class=\"muted\">No API security findings were generated.</p>"
      }
    </section>

    <section>
      <h2>Flowchart Source</h2>
      <pre>${escapeHtml(report?.mermaidFlowchart ?? "")}</pre>
    </section>
  </main>
</body>
</html>`;
};

export const buildPlaywrightSpecExport = (run: AnalysisRunView) => {
  const tests = run.result?.testCases ?? [];
  const lines = [
    "import { test, expect } from '@playwright/test';",
    "",
    `test.describe('SK CrawlPulse replay - ${specName(run.request.targetUrl)}', () => {`,
  ];

  if (tests.length === 0) {
    lines.push("  test('analysis result is available', async ({ page }) => {");
    lines.push(`    await page.goto(${JSON.stringify(run.request.targetUrl)});`);
    lines.push("    await expect(page.locator('body')).toBeVisible();");
    lines.push("  });");
  }

  tests.slice(0, 80).forEach((testCase) => {
    lines.push(`  test('${specName(testCase.testId)} - ${specName(testCase.title)}', async ({ page }) => {`);
    lines.push(`    await page.goto(${JSON.stringify(testCase.sourcePage || run.request.targetUrl)});`);
    lines.push("    await expect(page.locator('body')).toBeVisible();");
    testCase.steps.slice(0, 8).forEach((step) => lines.push(toSpecStepComment(step)));
    if (testCase.status === "FAIL") {
      lines.push("    test.info().annotations.push({ type: 'source', description: 'Generated from a failing SK CrawlPulse finding.' });");
    }
    lines.push("  });");
  });

  lines.push("});");
  lines.push("");

  return lines.join("\n");
};
