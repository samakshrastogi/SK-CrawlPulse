import type {
  AnalysisReport,
  BackendValidationResult,
  FrontendAnalysis,
  GeneratedTestCase,
} from "../../types/platform";

const buildFlowchart = (analysis: FrontendAnalysis): string => {
  const lines = ["flowchart TD"];

  analysis.navigationGraph.slice(0, 120).forEach((edge, index) => {
    const fromNode = `P${index}_A`;
    const actionNode = `P${index}_B`;
    const toNode = `P${index}_C`;
    lines.push(
      `  ${fromNode}["${edge.from.replace(/"/g, "'")}"] --> ${actionNode}["${edge.action.replace(/"/g, "'")}"]`,
    );
    lines.push(
      `  ${actionNode} -->|${edge.result ?? "PASS"}| ${toNode}["${edge.to.replace(/"/g, "'")}"]`,
    );
  });

  if (lines.length === 1) {
    lines.push(`  A["${analysis.baseUrl}"]`);
  }

  return lines.join("\n");
};

export const buildReport = ({
  runId,
  frontend,
  backendValidation,
}: {
  runId: string;
  frontend: FrontendAnalysis;
  testCases: GeneratedTestCase[];
  backendValidation: BackendValidationResult;
}): AnalysisReport => {
  const strictBehaviorLines = frontend.interactionResults
    .slice(0, 20)
    .map((interaction) => {
      const reasons = interaction.passReasons?.join(", ") || "none";
      return `${interaction.result} ${interaction.action} ${interaction.selector} -> reasons: ${reasons}`;
    });

  return ({
  runId,
  generatedAt: new Date().toISOString(),
  overview: {
    title: "System overview",
    summary: `Visited ${frontend.pages.length} pages, executed ${frontend.interactionResults.length} interaction checks, and ran ${frontend.scenarioResults.length} scenario probes.`,
    details: [
      `Base URL: ${frontend.baseUrl}`,
      `Coverage: ${frontend.coverageReport.coverage}`,
      `Runtime findings: ${frontend.runtimeFindings.length}`,
      `Failure clusters: ${frontend.failureClusters.length}`,
      `API assertions: ${frontend.apiAssertions.length}`,
      `Strict behavior evidence lines: ${strictBehaviorLines.length}`,
      `Backend validation provided: ${backendValidation.provided ? "yes" : "no"}`,
    ],
  },
  issues: {
    title: "Findings and risks",
    summary:
      frontend.runtimeFindings.length > 0
        ? "Runtime, API, accessibility, visual, and boundary findings were detected."
        : "No first-class runtime or accessibility findings were detected in this pass.",
    details: [
      ...frontend.runtimeFindings.slice(0, 24).map((finding) => `${finding.type}: ${finding.summary} (${finding.pageUrl})`),
      ...frontend.failureClusters.map(
        (cluster) => `${cluster.title}: ${cluster.summary} (${cluster.occurrences} occurrence${cluster.occurrences === 1 ? "" : "s"})`,
      ),
      ...backendValidation.observations,
      ...frontend.warnings,
      ...strictBehaviorLines.slice(0, 10),
    ],
  },
  performance: {
    title: "Performance and API assertions",
    summary: "Live API assertions flagged slow, failing, or structurally unclear responses.",
    details: frontend.apiAssertions
      .slice(0, 20)
      .map((assertion) =>
        `${assertion.method} ${assertion.url} [${assertion.status ?? "n/a"}] ${assertion.passed ? "PASS" : assertion.issues.join(", ")}`,
      ),
  },
  mermaidFlowchart: buildFlowchart(frontend),
  pdfOutline: [
    "1. Executive summary",
    "2. Recursive frontend inventory and flows",
    "3. Scenario packs and limit probes",
    "4. Runtime findings and clustered failures",
    "5. API assertions and backend correlation",
    "6. Accessibility and visual stability review",
  ],
  });
};
