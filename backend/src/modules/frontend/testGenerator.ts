import type { FrontendAnalysis, GeneratedTestCase, TestCategory, TestPriority } from "../../types/platform";

const interactionByScreenshot = (analysis: FrontendAnalysis, screenshotUrl?: string) =>
  analysis.interactionResults.find((item) => item.screenshotUrl === screenshotUrl);

const ownerByFindingType: Partial<Record<FrontendAnalysis["runtimeFindings"][number]["type"], string>> = {
  console_error: "Frontend runtime",
  js_exception: "Frontend runtime",
  request_failure: "API integration",
  api_contract: "API integration",
  accessibility: "Design system / accessibility",
  visual_regression: "Frontend UI",
  boundary_limit: "Frontend validation",
};

const priorityByCategory: Record<TestCategory, TestPriority> = {
  functional: "P1",
  negative: "P1",
  boundary: "P2",
  edge: "P2",
  ux: "P3",
  integration: "P1",
  performance: "P2",
};

const findingPriority = (severity: "low" | "medium" | "high"): TestPriority =>
  severity === "high" ? "P0" : severity === "medium" ? "P1" : "P2";

export const generateTestCases = (analysis: FrontendAnalysis): GeneratedTestCase[] => {
  const testCases: GeneratedTestCase[] = [];

  analysis.failureClusters.forEach((cluster, index) => {
    testCases.push({
      testId: `ISSUE-${index + 1}`,
      category: "functional",
      priority: "P0",
      title: cluster.title,
      description: cluster.summary,
      steps: [
        `Open one of the affected pages: ${toShortRoute(cluster.pages[0] ?? analysis.baseUrl)}`,
        "Trigger the visible action tied to this cluster",
        "Observe whether navigation, DOM updates, or network activity occur",
      ],
      expectedResult: "The interaction should produce a clear and observable effect without silent failure.",
      sourcePage: cluster.pages[0] ?? analysis.baseUrl,
      status: "FAIL",
      issueSummary: `${cluster.summary} (${cluster.occurrences} occurrence${cluster.occurrences === 1 ? "" : "s"})`,
      screenshotUrl: cluster.screenshotUrl,
      beforeScreenshotUrl: interactionByScreenshot(analysis, cluster.screenshotUrl)?.beforeScreenshotUrl,
      afterScreenshotUrl: interactionByScreenshot(analysis, cluster.screenshotUrl)?.afterScreenshotUrl,
      domDiffSummary: interactionByScreenshot(analysis, cluster.screenshotUrl)?.domDiffSummary,
      suggestions: cluster.suggestions,
      sourceKind: "failure_cluster",
      sourceLabel: "Repeated interaction failure cluster",
      affectedFlow: toShortRoute(cluster.pages[0] ?? analysis.baseUrl),
      userImpact: "A user-visible action appears to do nothing or fails without a clear recovery path.",
      confidence: "high",
      ownerHint: "Frontend interaction flow",
      evidenceItems: [
        `${cluster.occurrences} repeated occurrence${cluster.occurrences === 1 ? "" : "s"} detected`,
        ...cluster.pages.slice(0, 2).map((page) => `Observed on ${toShortRoute(page)}`),
      ],
    });
  });

  analysis.runtimeFindings.forEach((finding, index) => {
    testCases.push({
      testId: `FIND-${index + 1}`,
      category: finding.type === "boundary_limit" ? "boundary" : "functional",
      priority: findingPriority(finding.severity),
      title: finding.summary,
      description: finding.details,
      steps: [
        `Open ${finding.pageUrl}`,
        "Reproduce the state tied to the finding",
        "Compare the observed behavior with the evidence and expected UX/API contract",
      ],
      expectedResult: "The page should remain stable, accessible, and free of runtime/API errors.",
      sourcePage: finding.pageUrl,
      status: "FAIL",
      issueSummary: finding.evidence.join(" | "),
      screenshotUrl: finding.screenshotUrl,
      beforeScreenshotUrl: analysis.interactionResults.find((item) => item.buttonId === finding.relatedInteractionId)?.beforeScreenshotUrl,
      afterScreenshotUrl: analysis.interactionResults.find((item) => item.buttonId === finding.relatedInteractionId)?.afterScreenshotUrl,
      domDiffSummary: analysis.interactionResults.find((item) => item.buttonId === finding.relatedInteractionId)?.domDiffSummary,
      suggestions: buildSuggestionsForFinding(finding.type),
      sourceKind: "runtime_finding",
      sourceLabel: `Runtime finding: ${finding.type.replace(/_/g, " ")}`,
      affectedFlow: toShortRoute(finding.pageUrl),
      userImpact: userImpactForFinding(finding.type),
      confidence: finding.severity === "high" ? "high" : finding.severity === "medium" ? "medium" : "low",
      ownerHint: ownerByFindingType[finding.type] ?? "Frontend",
      evidenceItems: finding.evidence,
    });
  });

  analysis.scenarioResults.forEach((scenario, index) => {
    testCases.push({
      testId: `SCN-${index + 1}`,
      category:
        scenario.pack === "uploads" || scenario.pack === "pagination" || scenario.pack === "forms"
          ? "boundary"
          : "functional",
      priority: scenario.status === "FAIL" ? "P1" : "P2",
      title: `${scenario.pack.toUpperCase()} scenario on ${toShortRoute(scenario.pageUrl)}`,
      description: scenario.summary,
      steps: scenario.details,
      expectedResult: "The scenario should remain stable and produce the intended user outcome.",
      sourcePage: scenario.pageUrl,
      status: scenario.status === "FAIL" ? "FAIL" : "PASS",
      issueSummary: scenario.status === "FAIL" ? scenario.details.join(" | ") : undefined,
      screenshotUrl: scenario.screenshotUrl,
      suggestions: scenario.suggestions,
      sourceKind: "scenario",
      sourceLabel: `${scenario.pack.toUpperCase()} scenario pack`,
      affectedFlow: toShortRoute(scenario.pageUrl),
      userImpact:
        scenario.status === "FAIL"
          ? "A realistic user flow did not complete as expected."
          : "This confirms a representative user flow stayed stable during analysis.",
      confidence: scenario.status === "FAIL" ? "high" : "medium",
      ownerHint: ownerForScenarioPack(scenario.pack),
      evidenceItems: scenario.details,
    });
  });

  analysis.pages.forEach((page, pageIndex) => {
    testCases.push({
      testId: `FT-${pageIndex + 1}-001`,
      category: "functional",
      priority: priorityByCategory.functional,
      title: `Page renders successfully for ${page.routePath}`,
      description: `Validate that ${page.title} loads with the expected primary content and basic interactions.`,
      steps: [
        `Open ${page.url}`,
        "Wait for the document ready state to complete",
        `Verify at least one heading is visible: ${page.headings[0] ?? "page heading"}`,
      ],
      expectedResult: "The page loads without console-breaking UI issues and the expected content is visible.",
      sourcePage: page.url,
      status: "PASS",
      suggestions: ["Keep key content visible above the fold.", "Keep primary actions easy to identify."],
      sourceKind: "page_smoke",
      sourceLabel: "Baseline render smoke check",
      affectedFlow: page.routePath,
      userImpact: "Confirms the route is reachable and basic content is present.",
      confidence: "medium",
      ownerHint: "Frontend page shell",
      evidenceItems: [
        `Primary heading observed: ${page.headings[0] ?? "page heading"}`,
        `Interactive elements discovered: ${page.buttons.length + page.links.length + page.forms.length}`,
      ],
    });
  });

  return testCases;
};

const toShortRoute = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.pathname || "/"}${url.search}`;
  } catch {
    return value;
  }
};

const buildSuggestionsForFinding = (type: FrontendAnalysis["runtimeFindings"][number]["type"]) => {
  switch (type) {
    case "console_error":
    case "js_exception":
      return ["Fix the underlying runtime exception.", "Add regression coverage for the failing state."];
    case "request_failure":
    case "api_contract":
      return ["Validate backend status/schema/latency in CI.", "Handle backend failures with visible fallback states."];
    case "accessibility":
      return ["Add semantic labels and predictable focus order.", "Review ARIA usage against the actual control behavior."];
    case "visual_regression":
      return ["Constrain layout overflow and test narrow viewport states.", "Add screenshot review for this state."];
    case "boundary_limit":
      return ["Enforce explicit limits with validation messaging.", "Debounce repeated actions and large submissions."];
    default:
      return ["Review the finding and add a targeted regression test."];
  }
};

const userImpactForFinding = (type: FrontendAnalysis["runtimeFindings"][number]["type"]) => {
  switch (type) {
    case "console_error":
    case "js_exception":
      return "Users can hit broken or partially rendered UI states.";
    case "request_failure":
    case "api_contract":
      return "Critical data flows can fail or display stale/incomplete information.";
    case "accessibility":
      return "Some users may be unable to operate the interface reliably.";
    case "visual_regression":
      return "Content can become hard to read, clipped, or misaligned.";
    case "boundary_limit":
      return "High-input or limit states may break under real usage.";
    default:
      return "Users may encounter inconsistent behavior in this state.";
  }
};

const ownerForScenarioPack = (pack: string) => {
  switch (pack) {
    case "forms":
      return "Frontend form handling";
    case "uploads":
      return "Frontend upload flow";
    case "pagination":
      return "Frontend list navigation";
    default:
      return "Frontend flow owner";
  }
};
