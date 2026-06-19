import { promises as fs } from "fs";
import path from "path";
import { chromium } from "playwright";
import { env } from "../../config/env";
import type {
  AnalysisRunView,
  ApiAssertion,
  GeneratedTestCase,
  InteractionResult,
  PageAnalysis,
  RuntimeFinding,
} from "../../types/platform";

type Scorecard = {
  functional: number;
  accessibility: number;
  performance: number;
  apiReliability: number;
  uxStability: number;
  securitySignals: number;
  overall: number;
};

type ReportMetrics = {
  pagesDiscovered: number;
  pagesTested: number;
  pagesSkipped: number;
  interactionsTested: number;
  totalFindings: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  passedChecks: number;
  failedChecks: number;
  coveragePercent: number;
  formsTested: number;
  buttonsTested: number;
  linksTested: number;
  inputsTested: number;
  scenarioFlowsTested: number;
};

type RiskLevel = "Low" | "Medium" | "High" | "Critical";

const browserCandidates = [
  env.crawler.browserExecutablePath,
  ...env.crawler.browserFallbackExecutablePaths,
].filter((value): value is string => Boolean(value));

const resolveBrowserCandidates = async () => {
  const configuredCandidates = Array.from(new Set(browserCandidates));
  const existingCandidates: string[] = [];

  for (const executablePath of configuredCandidates) {
    if (await fs.access(executablePath).then(() => true).catch(() => false)) {
      existingCandidates.push(executablePath);
    }
  }

  return [...existingCandidates, undefined];
};

const escapeHtml = (value: string | number | undefined | null) =>
  String(value ?? "Not available")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value: string | Date | undefined) => {
  if (!value) {
    return "Not available";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toRoute = (value: string | undefined) => {
  if (!value) {
    return "Not available";
  }

  try {
    const url = new URL(value);
    return `${url.pathname || "/"}${url.search}`;
  } catch {
    return value;
  }
};

const parseCoverage = (value: string | undefined) => {
  const parsed = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
};

const normalizeSeverity = (finding: RuntimeFinding | GeneratedTestCase) => {
  if ("severity" in finding) {
    return finding.severity;
  }

  if (finding.priority === "P0") {
    return "critical";
  }

  if (finding.priority === "P1") {
    return "high";
  }

  if (finding.priority === "P2") {
    return "medium";
  }

  return "low";
};

const countBySeverity = (findings: RuntimeFinding[], tests: GeneratedTestCase[]) => {
  const failedP0Tests = tests.filter((test) => test.status === "FAIL" && normalizeSeverity(test) === "critical").length;

  return {
    critical: failedP0Tests,
    high: findings.filter((finding) => finding.severity === "high").length,
    medium: findings.filter((finding) => finding.severity === "medium").length,
    low: findings.filter((finding) => finding.severity === "low").length,
  };
};

const calculateMetrics = (run: AnalysisRunView): ReportMetrics => {
  const result = run.result;
  const pages = result?.frontend.pages ?? run.pages;
  const interactions = result?.frontend.interactionResults ?? run.interactions;
  const findings = result?.frontend.runtimeFindings ?? [];
  const tests = result?.testCases ?? [];
  const severity = countBySeverity(findings, tests);
  const coverage = result?.frontend.coverageReport;
  const passedChecks = coverage?.passed ?? interactions.filter((interaction) => interaction.result === "PASS").length;
  const failedChecks = coverage?.failed ?? interactions.filter((interaction) => interaction.result === "FAIL").length;

  return {
    pagesDiscovered: pages.length,
    pagesTested: new Set(interactions.map((interaction) => interaction.pageUrl)).size || pages.length,
    pagesSkipped: Math.max(pages.length - new Set(interactions.map((interaction) => interaction.pageUrl)).size, 0),
    interactionsTested: interactions.length,
    totalFindings: findings.length,
    criticalIssues: severity.critical,
    highIssues: severity.high,
    mediumIssues: severity.medium,
    lowIssues: severity.low,
    passedChecks,
    failedChecks,
    coveragePercent: parseCoverage(coverage?.coverage),
    formsTested: pages.reduce((total, page) => total + page.forms.length, 0),
    buttonsTested: pages.reduce((total, page) => total + page.buttons.length, 0),
    linksTested: pages.reduce((total, page) => total + page.links.length, 0),
    inputsTested: pages.reduce((total, page) => total + page.inputs.length, 0),
    scenarioFlowsTested: result?.frontend.scenarioResults.length ?? 0,
  };
};

const boundedScore = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const calculateHealthScore = (metrics: ReportMetrics) => {
  const penalty =
    metrics.criticalIssues * 30 +
    metrics.highIssues * 18 +
    metrics.mediumIssues * 8 +
    metrics.lowIssues * 3 +
    metrics.failedChecks * 6;
  const coverageBonus = metrics.coveragePercent * 0.22;
  return boundedScore(78 + coverageBonus - penalty);
};

const calculateRiskLevel = (metrics: ReportMetrics, score: number): RiskLevel => {
  if (metrics.criticalIssues > 0 || score < 35) {
    return "Critical";
  }

  if (metrics.highIssues > 2 || metrics.failedChecks > 5 || score < 55) {
    return "High";
  }

  if (metrics.highIssues > 0 || metrics.mediumIssues > 3 || score < 75) {
    return "Medium";
  }

  return "Low";
};

const calculateScorecard = (run: AnalysisRunView, metrics: ReportMetrics): Scorecard => {
  const result = run.result;
  const findings = result?.frontend.runtimeFindings ?? [];
  const apiAssertions = result?.frontend.apiAssertions ?? [];
  const failedApi = apiAssertions.filter((assertion) => !assertion.passed).length;
  const accessibilityFindings = findings.filter((finding) => finding.type === "accessibility").length;
  const uxFindings = findings.filter((finding) => finding.type === "visual_regression" || finding.type === "boundary_limit").length;
  const securitySignals = findings.filter((finding) => /auth|security|token|cookie|cors/i.test(`${finding.summary} ${finding.details}`)).length;

  const functional = boundedScore(100 - metrics.failedChecks * 8 - metrics.highIssues * 8 - metrics.criticalIssues * 18);
  const accessibility = boundedScore(100 - accessibilityFindings * 14 - metrics.mediumIssues * 2);
  const performance = boundedScore(100 - failedApi * 10 - apiAssertions.filter((assertion) => (assertion.latencyMs ?? 0) > 1500).length * 8);
  const apiReliability = boundedScore(apiAssertions.length === 0 ? 80 : 100 - failedApi * 14);
  const uxStability = boundedScore(100 - uxFindings * 12 - metrics.failedChecks * 3);
  const security = boundedScore(100 - securitySignals * 12);
  const overall = boundedScore((functional + accessibility + performance + apiReliability + uxStability + security) / 6);

  return {
    functional,
    accessibility,
    performance,
    apiReliability,
    uxStability,
    securitySignals: security,
    overall,
  };
};

const buildExecutiveSummary = (run: AnalysisRunView, metrics: ReportMetrics, score: number, risk: RiskLevel) => {
  const target = run.request.targetUrl;
  if (risk === "Low") {
    return `SK CrawlPulse analyzed ${target} and found that the overall website quality is stable. The run reached ${metrics.pagesDiscovered} page${metrics.pagesDiscovered === 1 ? "" : "s"} with ${metrics.coveragePercent}% coverage, and no major release-blocking risk was detected.`;
  }

  if (risk === "Medium") {
    return `SK CrawlPulse analyzed ${target} and found that the website is mostly usable, but a few issues should be fixed before a production release or client handoff. The current health score is ${score}/100.`;
  }

  if (risk === "High") {
    return `SK CrawlPulse analyzed ${target} and detected high-priority quality risks that may affect users. The site needs focused fixes and a regression pass before it should be treated as production-ready.`;
  }

  return `SK CrawlPulse analyzed ${target} and detected critical quality risks. The website is not recommended for production use until the blocking issues are fixed and verified.`;
};

const buildFinalVerdict = (metrics: ReportMetrics, score: number) => {
  if (metrics.criticalIssues > 0 || score < 40) {
    return {
      label: "Not recommended for production",
      detail: "Critical or blocking quality risks were detected. Fix these first, then rerun the scan.",
    };
  }

  if (metrics.highIssues > 2 || metrics.failedChecks > 5 || score < 60) {
    return {
      label: "Needs major fixes",
      detail: "Several high-priority issues or repeated failures remain. Stabilize the affected flows before release.",
    };
  }

  if (metrics.highIssues > 0 || metrics.mediumIssues > 0 || score < 82) {
    return {
      label: "Needs minor fixes",
      detail: "The website is close, but selected findings should be addressed before final approval.",
    };
  }

  return {
    label: "Ready for production",
    detail: "No major blockers were detected in the captured scope. Continue monitoring with scheduled scans.",
  };
};

const issueTitle = (finding: RuntimeFinding) =>
  finding.summary || `${finding.type.replace(/_/g, " ")} on ${toRoute(finding.pageUrl)}`;

const businessImpact = (finding: RuntimeFinding) => {
  if (finding.severity === "high") {
    return "This issue can block a key user journey, reduce trust, or prevent users from completing an important action.";
  }

  if (finding.severity === "medium") {
    return "This issue can create friction or inconsistent behavior for users and should be scheduled for remediation.";
  }

  return "This is a lower-risk signal, but fixing it can improve quality, accessibility, or user confidence.";
};

const suggestedFix = (finding: RuntimeFinding) => {
  switch (finding.type) {
    case "accessibility":
      return "Review labels, ARIA attributes, keyboard focus order, and contrast for the affected element or route.";
    case "api_contract":
    case "request_failure":
      return "Inspect the request contract, server response, status code, and error handling for this endpoint.";
    case "console_error":
    case "js_exception":
      return "Trace the browser console error to the owning component or script and add regression coverage after fixing it.";
    case "visual_regression":
      return "Compare the captured screenshot with the intended layout and fix spacing, responsive behavior, or loading state issues.";
    case "boundary_limit":
      return "Validate boundary conditions, input limits, and empty/error states for this flow.";
    default:
      return "Review the affected page, reproduce the issue, fix the root cause, and rerun the scan.";
  }
};

const reproduceSteps = (finding: RuntimeFinding, interactions: InteractionResult[]) => {
  const interaction = finding.relatedInteractionId
    ? interactions.find((item) => item.buttonId === finding.relatedInteractionId)
    : undefined;
  const steps = [`Open ${finding.pageUrl}.`];
  if (interaction) {
    steps.push(`Use ${interaction.action} on ${interaction.text || interaction.selector}.`);
  }
  steps.push("Observe the behavior described in the finding and compare it with the captured evidence.");
  return steps;
};

const buildRecommendationList = (run: AnalysisRunView, metrics: ReportMetrics) => {
  const findings = run.result?.frontend.runtimeFindings ?? [];
  const highFindings = findings.filter((finding) => finding.severity === "high");
  const apiFailures = run.result?.frontend.apiAssertions.filter((assertion) => !assertion.passed) ?? [];
  const accessibilityFindings = findings.filter((finding) => finding.type === "accessibility");

  return {
    immediate: [
      ...highFindings.slice(0, 5).map((finding) => `Fix ${issueTitle(finding)} on ${toRoute(finding.pageUrl)}.`),
      metrics.criticalIssues > 0 ? "Resolve failed P0 test cases before production approval." : "",
    ].filter(Boolean),
    shortTerm: [
      accessibilityFindings.length > 0 ? `Resolve ${accessibilityFindings.length} accessibility finding${accessibilityFindings.length === 1 ? "" : "s"}.` : "",
      apiFailures.length > 0 ? `Review ${apiFailures.length} failed API assertion${apiFailures.length === 1 ? "" : "s"} and add contract tests.` : "",
      "Improve validation, empty states, and user feedback around forms and interactive controls.",
    ].filter(Boolean),
    longTerm: [
      "Add scheduled scans for important routes and compare runs to detect regressions.",
      "Add generated Playwright tests into CI/CD for release gating.",
      "Expand coverage to authenticated, mobile, and cross-browser journeys.",
    ],
  };
};

const severityBadge = (severity: string) =>
  `<span class="badge severity-${escapeHtml(severity.toLowerCase())}">${escapeHtml(severity)}</span>`;

const statusBadge = (status: string) =>
  `<span class="badge status-${escapeHtml(status.toLowerCase())}">${escapeHtml(status)}</span>`;

const renderMetricCard = (label: string, value: string | number, hint?: string) => `
  <div class="metric-card">
    <p>${escapeHtml(label)}</p>
    <strong>${escapeHtml(value)}</strong>
    ${hint ? `<span>${escapeHtml(hint)}</span>` : ""}
  </div>
`;

const renderScoreRow = (label: string, value: number) => `
  <tr>
    <td>${escapeHtml(label)}</td>
    <td><div class="score-bar"><span style="width:${value}%"></span></div></td>
    <td class="number">${value}/100</td>
  </tr>
`;

const renderFindingsSummary = (findings: RuntimeFinding[]) => {
  const priorityFindings = findings.filter((finding) => finding.severity === "high");
  if (priorityFindings.length === 0) {
    return `<p class="empty">No critical or high severity findings were detected.</p>`;
  }

  return `
    <table>
      <thead>
        <tr><th>Finding</th><th>Severity</th><th>Affected page</th><th>Business impact</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${priorityFindings
          .map(
            (finding) => `
              <tr>
                <td>${escapeHtml(issueTitle(finding))}</td>
                <td>${severityBadge(finding.severity)}</td>
                <td>${escapeHtml(toRoute(finding.pageUrl))}</td>
                <td>${escapeHtml(businessImpact(finding))}</td>
                <td>${statusBadge("Open")}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
};

const renderDetailedFinding = (finding: RuntimeFinding, interactions: InteractionResult[]) => `
  <article class="finding-card">
    <div class="finding-head">
      <div>
        <p class="eyebrow">${escapeHtml(finding.findingId)}</p>
        <h3>${escapeHtml(issueTitle(finding))}</h3>
      </div>
      <div class="badge-row">${severityBadge(finding.severity)}${statusBadge("Open")}</div>
    </div>
    <div class="detail-grid">
      <div><strong>Category</strong><p>${escapeHtml(finding.type)}</p></div>
      <div><strong>Affected route</strong><p>${escapeHtml(toRoute(finding.pageUrl))}</p></div>
    </div>
    <h4>What happened</h4>
    <p>${escapeHtml(finding.summary)}</p>
    <h4>Why it matters</h4>
    <p>${escapeHtml(businessImpact(finding))}</p>
    <h4>Technical details</h4>
    <p>${escapeHtml(finding.details)}</p>
    <h4>Steps to reproduce</h4>
    <ol>${reproduceSteps(finding, interactions).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
    <h4>Suggested fix</h4>
    <p>${escapeHtml(suggestedFix(finding))}</p>
    <h4>Evidence</h4>
    ${
      finding.evidence.length > 0 || finding.screenshotUrl
        ? `<ul>${[
            ...finding.evidence,
            finding.screenshotUrl ? `Screenshot artifact: ${finding.screenshotUrl}` : "",
          ]
            .filter(Boolean)
            .slice(0, 8)
            .map((item) => `<li>${escapeHtml(item)}</li>`)
            .join("")}</ul>`
        : `<p class="empty">No evidence artifact was attached.</p>`
    }
  </article>
`;

const renderApiObservationRows = (apiAssertions: ApiAssertion[]) => {
  const relevant = apiAssertions.filter(
    (assertion) => !assertion.passed || (assertion.status ?? 0) >= 400 || (assertion.latencyMs ?? 0) > 1200,
  );
  if (relevant.length === 0) {
    return `<p class="empty">No failed, slow, 4xx, or 5xx API observations were captured.</p>`;
  }

  return `
    <table>
      <thead><tr><th>Request URL</th><th>Method</th><th>Status</th><th>Response time</th><th>Notes</th></tr></thead>
      <tbody>
        ${relevant
          .slice(0, 30)
          .map(
            (assertion) => `
              <tr>
                <td>${escapeHtml(assertion.url)}</td>
                <td>${escapeHtml(assertion.method)}</td>
                <td>${escapeHtml(assertion.status ?? "n/a")}</td>
                <td>${escapeHtml(assertion.latencyMs ? `${assertion.latencyMs}ms` : "Not available")}</td>
                <td>${escapeHtml(assertion.issues.join(", ") || (assertion.passed ? "Passed" : "Needs review"))}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
};

const renderAccessibilitySummary = (findings: RuntimeFinding[]) => {
  const accessibilityFindings = findings.filter((finding) => finding.type === "accessibility");
  const categories = [
    ["Missing labels", /label/i],
    ["Missing alt text", /alt/i],
    ["Low contrast issues", /contrast/i],
    ["Keyboard navigation risks", /keyboard|focus/i],
    ["ARIA warnings", /aria/i],
  ] as const;

  return `
    <div class="cards-grid">
      ${categories
        .map(([label, matcher]) => {
          const count = accessibilityFindings.filter((finding) => matcher.test(`${finding.summary} ${finding.details} ${finding.evidence.join(" ")}`)).length;
          return renderMetricCard(label, count, count > 0 ? "Needs review" : "No signal captured");
        })
        .join("")}
    </div>
    ${
      accessibilityFindings.length > 0
        ? `<ul>${accessibilityFindings.slice(0, 8).map((finding) => `<li>${escapeHtml(finding.summary)}</li>`).join("")}</ul>`
        : `<p class="empty">No accessibility findings were captured in this run.</p>`
    }
  `;
};

const renderTestCases = (tests: GeneratedTestCase[]) => {
  if (tests.length === 0) {
    return `<p class="empty">No generated test cases are available.</p>`;
  }

  return tests
    .slice(0, 60)
    .map(
      (test) => `
        <article class="test-card">
          <div class="finding-head">
            <div>
              <p class="eyebrow">${escapeHtml(test.testId)}</p>
              <h3>${escapeHtml(test.title)}</h3>
            </div>
            <div class="badge-row">${statusBadge(test.status ?? "PASS")}<span class="badge">${escapeHtml(test.priority)}</span></div>
          </div>
          <p><strong>Preconditions:</strong> Open ${escapeHtml(test.sourcePage || "the target website")}.</p>
          <p><strong>Description:</strong> ${escapeHtml(test.description)}</p>
          <ol>${test.steps.slice(0, 10).map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>
          <p><strong>Expected result:</strong> ${escapeHtml(test.expectedResult)}</p>
          <p><strong>Actual result:</strong> ${escapeHtml(test.status === "FAIL" ? test.issueSummary ?? "The generated check failed." : "Passed or not flagged during this run.")}</p>
          <p><strong>Related evidence:</strong> ${escapeHtml([test.screenshotUrl, ...(test.evidenceItems ?? [])].filter(Boolean).join(", ") || "Not available")}</p>
        </article>
      `,
    )
    .join("");
};

const renderRegressionSummary = () => `
  <p class="empty">No previous run comparison was available for this report.</p>
`;

const renderRecommendations = (recommendations: ReturnType<typeof buildRecommendationList>) => `
  <div class="recommendation-grid">
    <div>
      <h3>Immediate fixes</h3>
      <ul>${(recommendations.immediate.length > 0 ? recommendations.immediate : ["No immediate critical or high severity fixes were identified."]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
    <div>
      <h3>Short-term improvements</h3>
      <ul>${recommendations.shortTerm.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
    <div>
      <h3>Long-term improvements</h3>
      <ul>${recommendations.longTerm.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  </div>
`;

const buildReportHtml = (run: AnalysisRunView) => {
  const result = run.result;
  const pages = result?.frontend.pages ?? run.pages;
  const interactions = result?.frontend.interactionResults ?? run.interactions;
  const findings = result?.frontend.runtimeFindings ?? [];
  const apiAssertions = result?.frontend.apiAssertions ?? [];
  const tests = result?.testCases ?? [];
  const rootCauseAnalyses = result?.frontend.rootCauseAnalyses ?? [];
  const securityFindings = result?.frontend.securityFindings ?? [];
  const coverageScore = result?.frontend.coverageScore;
  const metrics = calculateMetrics(run);
  const healthScore = calculateHealthScore(metrics);
  const risk = calculateRiskLevel(metrics, healthScore);
  const scorecard = calculateScorecard(run, metrics);
  const verdict = buildFinalVerdict(metrics, healthScore);
  const recommendations = buildRecommendationList(run, metrics);
  const generatedAt = new Date();
  const environment = run.request.options?.crawlProfile ?? env.runtime.nodeEnv;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SK CrawlPulse Website Quality Assurance Report</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; color: #172033; background: #f5f7fb; font-family: "Segoe UI", Arial, sans-serif; font-size: 12px; line-height: 1.5; }
    @page { size: A4; margin: 18mm 14mm 18mm; }
    .page { min-height: 100vh; padding: 24px; page-break-after: always; background: #fff; }
    .page:last-child { page-break-after: auto; }
    .cover { display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(135deg, #0f766e 0%, #0f172a 70%); color: #fff; }
    .brand { font-size: 12px; letter-spacing: 0.22em; text-transform: uppercase; color: #a7f3d0; font-weight: 700; }
    h1 { margin: 16px 0 8px; font-size: 40px; line-height: 1.08; letter-spacing: -0.02em; }
    h2 { margin: 0 0 14px; font-size: 22px; color: #0f172a; }
    h3 { margin: 0 0 8px; font-size: 15px; color: #0f172a; }
    h4 { margin: 13px 0 4px; font-size: 12px; color: #334155; text-transform: uppercase; letter-spacing: 0.08em; }
    p { margin: 0 0 8px; }
    ul, ol { margin: 6px 0 0 18px; padding: 0; }
    li { margin: 3px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; page-break-inside: auto; }
    th, td { border: 1px solid #dbe3ef; padding: 8px; vertical-align: top; text-align: left; overflow-wrap: anywhere; }
    th { background: #eff6ff; color: #0f172a; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
    tr { page-break-inside: avoid; }
    .section { page-break-before: always; }
    .section:first-child { page-break-before: auto; }
    .cover-grid, .cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .cover-card { border: 1px solid rgba(255,255,255,0.22); border-radius: 16px; padding: 14px; background: rgba(255,255,255,0.08); }
    .cover-card p, .metric-card p { margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
    .cover-card p { color: #bae6fd; }
    .cover-card strong { display: block; margin-top: 7px; font-size: 16px; overflow-wrap: anywhere; }
    .summary-box, .finding-card, .test-card, .panel { border: 1px solid #dbe3ef; border-radius: 16px; padding: 14px; background: #fff; margin: 10px 0; page-break-inside: avoid; }
    .muted-panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px; }
    .metric-card { border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px; background: #f8fafc; page-break-inside: avoid; }
    .metric-card strong { display: block; margin-top: 6px; font-size: 22px; color: #0f172a; }
    .metric-card span { display: block; margin-top: 3px; color: #64748b; font-size: 11px; }
    .badge-row { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
    .badge { display: inline-block; border-radius: 999px; padding: 4px 9px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; background: #e2e8f0; color: #334155; }
    .severity-critical { background: #fee2e2; color: #991b1b; }
    .severity-high { background: #ffedd5; color: #9a3412; }
    .severity-medium { background: #fef3c7; color: #92400e; }
    .severity-low { background: #dbeafe; color: #1e40af; }
    .status-pass, .status-passed { background: #dcfce7; color: #166534; }
    .status-fail, .status-open, .status-failed { background: #fee2e2; color: #991b1b; }
    .risk-Low { background: #dcfce7; color: #166534; }
    .risk-Medium { background: #fef3c7; color: #92400e; }
    .risk-High { background: #ffedd5; color: #9a3412; }
    .risk-Critical { background: #fee2e2; color: #991b1b; }
    .score-ring { width: 128px; height: 128px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(#22c55e ${healthScore}%, rgba(255,255,255,0.18) 0); }
    .score-ring div { width: 94px; height: 94px; border-radius: 50%; display: grid; place-items: center; background: #0f172a; color: #fff; font-size: 26px; font-weight: 800; }
    .cover-title-row { display: grid; grid-template-columns: 1fr 150px; gap: 24px; align-items: center; }
    .finding-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .eyebrow { margin: 0 0 4px; color: #64748b; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 700; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .detail-grid div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px; overflow-wrap: anywhere; }
    .score-bar { height: 9px; border-radius: 999px; background: #e2e8f0; overflow: hidden; }
    .score-bar span { display: block; height: 100%; background: linear-gradient(90deg, #0891b2, #22c55e); }
    .number { white-space: nowrap; font-weight: 700; }
    .recommendation-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
    .recommendation-grid div { border: 1px solid #dbe3ef; border-radius: 14px; padding: 12px; background: #f8fafc; page-break-inside: avoid; }
    .empty { color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 12px; }
    .small { font-size: 11px; color: #64748b; }
    .footer-note { color: rgba(255,255,255,0.72); font-size: 11px; }
  </style>
</head>
<body>
  <section class="page cover">
    <div>
      <p class="brand">SK CrawlPulse</p>
      <div class="cover-title-row">
        <div>
          <h1>Website Quality Assurance Report</h1>
          <p style="font-size:16px;color:#dbeafe">Professional website testing report for technical and non-technical stakeholders.</p>
        </div>
        <div class="score-ring"><div>${healthScore}</div></div>
      </div>
      <div style="margin-top:28px" class="cover-grid">
        <div class="cover-card"><p>Website URL</p><strong>${escapeHtml(run.request.targetUrl)}</strong></div>
        <div class="cover-card"><p>Run ID</p><strong>${escapeHtml(run.runId)}</strong></div>
        <div class="cover-card"><p>Generated</p><strong>${escapeHtml(formatDate(generatedAt))}</strong></div>
        <div class="cover-card"><p>Environment</p><strong>${escapeHtml(environment)}</strong></div>
        <div class="cover-card"><p>Health score</p><strong>${healthScore}/100</strong></div>
        <div class="cover-card"><p>Risk level</p><strong><span class="badge risk-${risk}">${risk}</span></strong></div>
      </div>
    </div>
    <p class="footer-note">Generated by SK CrawlPulse. This report is based on captured automated crawl, interaction, API, and test-generation evidence.</p>
  </section>

  <section class="page section">
    <h2>1. Executive Summary</h2>
    <div class="summary-box"><p>${escapeHtml(buildExecutiveSummary(run, metrics, healthScore, risk))}</p></div>
    <div class="cards-grid">
      ${renderMetricCard("Pages discovered", metrics.pagesDiscovered)}
      ${renderMetricCard("Pages tested", metrics.pagesTested)}
      ${renderMetricCard("Coverage score", coverageScore?.overallScore ?? 0)}
      ${renderMetricCard("Interactions tested", metrics.interactionsTested)}
      ${renderMetricCard("Total findings", metrics.totalFindings)}
      ${renderMetricCard("Critical issues", metrics.criticalIssues)}
      ${renderMetricCard("High issues", metrics.highIssues)}
      ${renderMetricCard("Medium issues", metrics.mediumIssues)}
      ${renderMetricCard("Low issues", metrics.lowIssues)}
      ${renderMetricCard("Passed checks", metrics.passedChecks)}
      ${renderMetricCard("Coverage", `${metrics.coveragePercent}%`)}
      ${renderMetricCard("Failed checks", metrics.failedChecks)}
      ${renderMetricCard("Scenario flows", metrics.scenarioFlowsTested)}
    </div>
  </section>

  <section class="page section">
    <h2>2. Quality Scorecard</h2>
    <table>
      <thead><tr><th>Area</th><th>Score</th><th>Value</th></tr></thead>
      <tbody>
        ${renderScoreRow("Functional Testing", scorecard.functional)}
        ${renderScoreRow("Accessibility", scorecard.accessibility)}
        ${renderScoreRow("Performance", scorecard.performance)}
        ${renderScoreRow("API Reliability", scorecard.apiReliability)}
        ${renderScoreRow("UX Stability", scorecard.uxStability)}
        ${renderScoreRow("Security Signals", scorecard.securitySignals)}
        ${renderScoreRow("Overall Score", scorecard.overall)}
      </tbody>
    </table>
  </section>

  <section class="page section">
    <h2>3. Critical Findings Summary</h2>
    ${renderFindingsSummary(findings)}
  </section>

  <section class="page section">
    <h2>4. Website Coverage Report</h2>
    <div class="cards-grid">
      ${renderMetricCard("Pages discovered", metrics.pagesDiscovered)}
      ${renderMetricCard("Pages tested", metrics.pagesTested)}
      ${renderMetricCard("Pages skipped", metrics.pagesSkipped)}
      ${renderMetricCard("Forms tested", metrics.formsTested)}
      ${renderMetricCard("Buttons tested", metrics.buttonsTested)}
      ${renderMetricCard("Links tested", metrics.linksTested)}
      ${renderMetricCard("Inputs tested", metrics.inputsTested)}
      ${renderMetricCard("Scenario flows tested", metrics.scenarioFlowsTested)}
      ${renderMetricCard("Coverage", `${metrics.coveragePercent}%`)}
    </div>
    <table>
      <thead><tr><th>Route</th><th>Title</th><th>Depth</th><th>Buttons</th><th>Links</th><th>Forms</th></tr></thead>
      <tbody>
        ${pages
          .slice(0, 40)
          .map(
            (page: PageAnalysis) => `
              <tr>
                <td>${escapeHtml(toRoute(page.url))}</td>
                <td>${escapeHtml(page.title || "Not available")}</td>
                <td>${escapeHtml(page.depth)}</td>
                <td>${escapeHtml(page.buttons.length)}</td>
                <td>${escapeHtml(page.links.length)}</td>
                <td>${escapeHtml(page.forms.length)}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  </section>

  <section class="page section">
    <h2>5. Detailed Findings</h2>
    ${findings.length > 0 ? findings.map((finding) => renderDetailedFinding(finding, interactions)).join("") : `<p class="empty">No findings detected.</p>`}
  </section>

  <section class="page section">
    <h2>6. Root Cause Analysis</h2>
    ${
      rootCauseAnalyses.length > 0
        ? rootCauseAnalyses
            .slice(0, 20)
            .map(
              (analysis) => `
                <article class="finding-card">
                  <div class="finding-head">
                    <div>
                      <p class="eyebrow">${escapeHtml(analysis.findingId)}</p>
                      <h3>${escapeHtml(analysis.probableRootCause)}</h3>
                    </div>
                    <div class="badge-row"><span class="badge">Confidence ${escapeHtml(analysis.confidenceScore)}%</span></div>
                  </div>
                  <p><strong>Technical explanation:</strong> ${escapeHtml(analysis.technicalExplanation)}</p>
                  <p><strong>User impact:</strong> ${escapeHtml(analysis.userImpact)}</p>
                  <p><strong>Suggested fix:</strong> ${escapeHtml(analysis.suggestedFix)}</p>
                </article>
              `,
            )
            .join("")
        : `<p class="empty">No root cause analysis was generated for this run.</p>`
    }
  </section>

  <section class="page section">
    <h2>7. API and Backend Observations</h2>
    ${renderApiObservationRows(apiAssertions)}
    <div class="panel">
      <h3>Backend correlation notes</h3>
      ${
        result?.backendValidation.observations.length
          ? `<ul>${result.backendValidation.observations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
          : `<p class="empty">No backend observations captured.</p>`
      }
    </div>
  </section>

  <section class="page section">
    <h2>8. Security Findings</h2>
    ${
      securityFindings.length > 0
        ? `<table><thead><tr><th>Risk</th><th>Category</th><th>Method</th><th>Request</th><th>Remediation</th></tr></thead><tbody>${securityFindings.slice(0, 20).map((finding) => `<tr><td>${escapeHtml(finding.riskLevel)}</td><td>${escapeHtml(finding.category)}</td><td>${escapeHtml(finding.method)}</td><td>${escapeHtml(finding.requestUrl)}</td><td>${escapeHtml(finding.remediation)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="empty">No API security findings were generated for this run.</p>`
    }
  </section>

  <section class="page section">
    <h2>9. Accessibility Summary</h2>
    ${renderAccessibilitySummary(findings)}
  </section>

  <section class="page section">
    <h2>10. Generated Test Cases</h2>
    ${renderTestCases(tests)}
  </section>

  <section class="page section">
    <h2>11. Regression / Comparison Summary</h2>
    ${renderRegressionSummary()}
  </section>

  <section class="page section">
    <h2>12. Recommendations</h2>
    ${renderRecommendations(recommendations)}
  </section>

  <section class="page section">
    <h2>13. Final Verdict</h2>
    <div class="summary-box">
      <h3>${escapeHtml(verdict.label)}</h3>
      <p>${escapeHtml(verdict.detail)}</p>
      <p class="small">Verdict based on severity distribution, failed checks, coverage, and calculated health score.</p>
    </div>
  </section>
</body>
</html>`;
};

const launchPdfBrowser = async () => {
  const candidates = await resolveBrowserCandidates();
  let lastError: unknown;

  for (const executablePath of candidates) {
    try {
      return await chromium.launch({
        headless: true,
        executablePath,
        args: ["--disable-dev-shm-usage", "--no-sandbox"],
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to launch Chromium for PDF generation");
};

export const generateProfessionalPdfReport = async (run: AnalysisRunView) => {
  const reportsDir = path.resolve(process.cwd(), env.runtime.artifactsDir, "reports");
  await fs.mkdir(reportsDir, { recursive: true });

  const fileName = `SK-CrawlPulse-Report-${run.runId}.pdf`;
  const outputPath = path.join(reportsDir, fileName);
  const html = buildReportHtml(run);
  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } });
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      margin: {
        top: "18mm",
        right: "14mm",
        bottom: "18mm",
        left: "14mm",
      },
      headerTemplate: `
        <div style="width:100%;font-family:Arial,sans-serif;font-size:9px;color:#64748b;padding:0 14mm;">
          SK CrawlPulse · Website Quality Assurance Report
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;font-family:Arial,sans-serif;font-size:9px;color:#64748b;padding:0 14mm;display:flex;justify-content:space-between;">
          <span>${escapeHtml(run.runId)}</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });
  } finally {
    await browser.close();
  }

  return {
    fileName,
    outputPath,
  };
};
