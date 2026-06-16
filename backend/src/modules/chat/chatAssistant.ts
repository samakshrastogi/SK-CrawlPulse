import type { AnalysisRunView } from "../../types/platform";

const includesAny = (question: string, terms: string[]) => terms.some((term) => question.includes(term));
const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "what",
  "why",
  "how",
  "did",
  "does",
  "are",
  "was",
  "were",
  "can",
  "about",
  "from",
  "into",
  "show",
  "tell",
  "give",
  "please",
  "project",
]);

type SearchRecord = {
  source: string;
  title: string;
  body: string;
  priority: number;
};

const topFixes = (run: AnalysisRunView) => {
  const findings = run.result?.frontend.runtimeFindings ?? [];
  return findings
    .slice()
    .sort((left, right) => {
      const weight = { high: 3, medium: 2, low: 1 };
      return weight[right.severity] - weight[left.severity];
    })
    .slice(0, 5)
    .map((finding) => `${finding.severity.toUpperCase()}: ${finding.summary} on ${finding.pageUrl}`);
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .split(/[^a-z0-9:/._-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));

const scoreRecord = (record: SearchRecord, terms: string[]) => {
  const haystack = `${record.title} ${record.body}`.toLowerCase();
  const matches = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
  return matches * 10 + record.priority;
};

const compact = (value: string, maxLength = 240) => {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 3)}...`;
};

const buildSearchRecords = (run: AnalysisRunView): SearchRecord[] => {
  const result = run.result;
  if (!result) {
    return [
      {
        source: "run.progress",
        title: run.progress.stageLabel,
        body: `${run.status}. ${run.progress.summary}. ${run.progress.technical}`,
        priority: 3,
      },
      ...run.logs.map((log) => ({
        source: "logs",
        title: `${log.level} ${log.scope}`,
        body: log.message,
        priority: log.level === "error" ? 6 : log.level === "warn" ? 4 : 1,
      })),
    ];
  }

  return [
    {
      source: "run.summary",
      title: `Run ${run.status}`,
      body: `${run.request.targetUrl}. ${run.progress.summary}. Coverage ${result.coverageScore.overallScore}/100. Findings ${result.frontend.runtimeFindings.length}.`,
      priority: 4,
    },
    ...result.frontend.runtimeFindings.map((finding) => ({
      source: "runtimeFindings",
      title: `${finding.severity} ${finding.type}: ${finding.summary}`,
      body: [
        finding.details,
        finding.pageUrl,
        finding.deviceName,
        finding.evidence.join(" "),
        finding.rootCause?.probableRootCause,
        finding.rootCause?.suggestedFix,
      ].filter(Boolean).join(". "),
      priority: finding.severity === "high" ? 10 : finding.severity === "medium" ? 7 : 4,
    })),
    ...result.frontend.securityFindings.map((finding) => ({
      source: "securityFindings",
      title: `${finding.riskLevel} ${finding.category}`,
      body: `${finding.method} ${finding.requestUrl}. ${finding.status ?? ""}. ${finding.evidence.join(" ")} ${finding.remediation}`,
      priority: finding.riskLevel === "critical" ? 10 : finding.riskLevel === "high" ? 9 : finding.riskLevel === "medium" ? 6 : 3,
    })),
    ...result.frontend.pages.map((page) => ({
      source: "pages",
      title: `${page.title || page.routePath} ${page.deviceName ?? "Desktop"}`,
      body: `${page.url}. ${page.headings.join(" ")}. Buttons: ${page.buttons.map((item) => item.text).join(", ")}. Links: ${page.links.map((item) => item.text).join(", ")}. Notes: ${page.interactionNotes.join(" ")}`,
      priority: 2,
    })),
    ...result.frontend.interactionResults.map((interaction) => ({
      source: "interactionResults",
      title: `${interaction.result} ${interaction.action} ${interaction.text || interaction.selector}`,
      body: `${interaction.pageUrl}. ${interaction.error ?? ""} ${interaction.issueSummary ?? ""} ${interaction.domDiffSummary ?? ""} ${(interaction.passReasons ?? []).join(" ")}`,
      priority: interaction.result === "FAIL" ? 8 : 2,
    })),
    ...result.frontend.networkRequests.map((request) => ({
      source: "networkRequests",
      title: `${request.failed ? "FAILED" : request.status ?? "observed"} ${request.method} ${request.resourceType}`,
      body: `${request.url}. ${request.pageUrl ?? ""}. ${request.failureText ?? ""}. ${request.contentType ?? ""}. ${(request.responseShape ?? []).join(" ")}`,
      priority: request.failed || (request.status && request.status >= 400) ? 7 : 2,
    })),
    ...result.frontend.apiAssertions.map((assertion) => ({
      source: "apiAssertions",
      title: `${assertion.passed ? "PASS" : "FAIL"} ${assertion.method} ${assertion.url}`,
      body: `${assertion.pageUrl ?? ""}. Status ${assertion.status ?? "unknown"}. ${assertion.issues.join(" ")} ${(assertion.responseShape ?? []).join(" ")}`,
      priority: assertion.passed ? 2 : 7,
    })),
    ...result.testCases.map((test) => ({
      source: "testCases",
      title: `${test.priority} ${test.status ?? "planned"} ${test.title}`,
      body: `${test.category}. ${test.description}. ${test.steps.join(" ")}. ${test.expectedResult}. ${test.issueSummary ?? ""} ${(test.suggestions ?? []).join(" ")}`,
      priority: test.status === "FAIL" ? 8 : test.priority === "P0" ? 7 : 3,
    })),
    ...result.frontend.scenarioResults.map((scenario) => ({
      source: "scenarioResults",
      title: `${scenario.status} ${scenario.pack}: ${scenario.summary}`,
      body: `${scenario.pageUrl}. ${scenario.details.join(" ")} ${scenario.suggestions.join(" ")}`,
      priority: scenario.status === "FAIL" ? 8 : 2,
    })),
    ...run.logs.map((log) => ({
      source: "logs",
      title: `${log.level} ${log.scope}`,
      body: log.message,
      priority: log.level === "error" ? 8 : log.level === "warn" ? 5 : 1,
    })),
    {
      source: "report",
      title: result.report.overview?.title ?? "Report overview",
      body: [
        result.report.overview?.summary,
        ...(result.report.overview?.details ?? []),
        result.report.issues?.summary,
        ...(result.report.issues?.details ?? []),
        result.report.performance?.summary,
        ...(result.report.performance?.details ?? []),
      ].filter(Boolean).join(" "),
      priority: 3,
    },
  ];
};

const answerFromSearch = (run: AnalysisRunView, question: string) => {
  const terms = tokenize(question);
  const records = buildSearchRecords(run);
  const ranked = records
    .map((record) => ({ record, score: scoreRecord(record, terms) }))
    .filter((item) => item.score > item.record.priority || terms.length === 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  if (ranked.length === 0) {
    const result = run.result;
    return {
      answer: result
        ? `I searched the run data but did not find a direct match. Available data includes ${result.frontend.pages.length} pages, ${result.frontend.runtimeFindings.length} findings, ${result.frontend.interactionResults.length} interactions, ${result.frontend.networkRequests.length} network observations, ${result.testCases.length} generated tests, and ${run.logs.length} logs.`
        : `I searched the current run state but did not find a direct match. The run is ${run.status}: ${run.progress.summary}.`,
      sources: ["run.summary"],
      mode: "rule-based" as const,
    };
  }

  const answer = ranked
    .map(({ record }, index) => `${index + 1}. ${record.title}: ${compact(record.body)}`)
    .join(" ");
  const sources = Array.from(new Set(ranked.map(({ record }) => record.source)));

  return {
    answer,
    sources,
    mode: "rule-based" as const,
  };
};

export const answerRunQuestion = (run: AnalysisRunView, rawQuestion: unknown) => {
  const question = typeof rawQuestion === "string" ? rawQuestion.trim().toLowerCase() : "";
  const result = run.result;

  if (!question) {
    return {
      answer: "Ask about findings, failing flows, critical issues, coverage, API behavior, mobile results, or what to fix first.",
      sources: [],
      mode: "rule-based" as const,
    };
  }

  if (!result) {
    return {
      answer: `Run ${run.runId} is ${run.status}. A full assistant answer is available after the run completes, but the current stage is: ${run.progress.summary}`,
      sources: ["run.progress"],
      mode: "rule-based" as const,
    };
  }

  if (includesAny(question, ["login", "auth", "sign in", "signin"])) {
    const authFindings = result.frontend.runtimeFindings.filter((finding) => /login|auth|sign|password|session/i.test(`${finding.summary} ${finding.details} ${finding.pageUrl}`));
    const checkpoint = run.progress.checkpoint;
    return {
      answer:
        authFindings.length > 0
          ? `Login/authentication has ${authFindings.length} related issue signal(s). Most likely causes: ${authFindings.slice(0, 3).map((finding) => finding.rootCause?.probableRootCause ?? finding.summary).join("; ")}.`
          : checkpoint
            ? `The run paused at an authentication checkpoint: ${checkpoint.label}. Protected pages may be untested until login is completed.`
            : "No specific login failure was captured in this run. Check generated tests and interaction results for auth routes if you expected a login flow.",
      sources: ["runtimeFindings", "progress.checkpoint"],
      mode: "rule-based" as const,
    };
  }

  if (includesAny(question, ["critical", "highest", "severe", "priority"])) {
    const critical = result.testCases.filter((test) => test.status === "FAIL" && test.priority === "P0");
    const high = result.frontend.runtimeFindings.filter((finding) => finding.severity === "high");
    return {
      answer: `Critical/P0 failures: ${critical.length}. High severity findings: ${high.length}. ${[...critical.map((test) => test.title), ...high.map((finding) => finding.summary)].slice(0, 5).join(" | ") || "No critical or high issues were detected."}`,
      sources: ["testCases", "runtimeFindings"],
      mode: "rule-based" as const,
    };
  }

  if (includesAny(question, ["fix first", "what should", "recommend", "next"])) {
    const fixes = topFixes(run);
    return {
      answer: fixes.length > 0 ? `Fix these first: ${fixes.join(" | ")}` : "No urgent fix order was inferred. Start by increasing coverage or reviewing generated test cases.",
      sources: ["runtimeFindings", "rootCauseAnalyses"],
      mode: "rule-based" as const,
    };
  }

  if (includesAny(question, ["coverage", "tested", "score"])) {
    const coverage = result.coverageScore;
    return {
      answer: `Overall coverage score is ${coverage.overallScore}/100. Pages: ${coverage.pagesTested}/${coverage.pagesDiscovered}, forms: ${coverage.formsTested}/${coverage.formsDetected}, buttons: ${coverage.buttonsTested}/${coverage.buttonsDetected}, links: ${coverage.linksValidated}/${coverage.linksDetected}, API endpoints: ${coverage.apiEndpointsAnalyzed}/${coverage.apiEndpointsObserved}, devices: ${coverage.mobileDevicesTested.join(", ") || "none"}.`,
      sources: ["coverageScore"],
      mode: "rule-based" as const,
    };
  }

  if (includesAny(question, ["security", "cors", "sensitive", "auth header", "rate"])) {
    const security = result.securityFindings;
    return {
      answer: security.length > 0
        ? `Security analysis found ${security.length} signal(s). Top risks: ${security.slice(0, 5).map((finding) => `${finding.riskLevel} ${finding.category} at ${finding.method} ${finding.requestUrl}`).join(" | ")}`
        : "No API security findings were generated from captured traffic.",
      sources: ["securityFindings"],
      mode: "rule-based" as const,
    };
  }

  if (includesAny(question, ["mobile", "iphone", "pixel", "galaxy", "ipad", "device"])) {
    const mobile = result.mobileComparison;
    return {
      answer: mobile
        ? `${mobile.summary} Device-specific issue counts: ${mobile.deviceOnlyIssues.map((item) => `${item.deviceName}: ${item.findingIds.length}`).join(", ")}.`
        : `Mobile comparison is not available. Devices tested: ${result.coverageScore.mobileDevicesTested.join(", ") || "none"}.`,
      sources: ["mobileComparison", "coverageScore"],
      mode: "rule-based" as const,
    };
  }

  return answerFromSearch(run, question);
};
