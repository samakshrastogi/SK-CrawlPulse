import type { AnalysisRunView } from "../../types/platform";

const includesAny = (question: string, terms: string[]) => terms.some((term) => question.includes(term));

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

  return {
    answer: `This run found ${result.frontend.runtimeFindings.length} findings, ${result.frontend.coverageReport.failed} failed checks, ${result.securityFindings.length} security signals, and coverage score ${result.coverageScore.overallScore}/100. Ask a focused question such as "what should be fixed first?" or "why did login fail?" for more detail.`,
    sources: ["runtimeFindings", "coverageScore", "securityFindings"],
    mode: "rule-based" as const,
  };
};
