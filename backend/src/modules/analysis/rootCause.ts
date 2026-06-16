import type { FrontendAnalysis, InteractionResult, RootCauseAnalysis, RuntimeFinding } from "../../types/platform";

const clampConfidence = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const findRelatedInteraction = (finding: RuntimeFinding, interactions: InteractionResult[]) =>
  finding.relatedInteractionId
    ? interactions.find((interaction) => interaction.buttonId === finding.relatedInteractionId)
    : interactions.find((interaction) => interaction.pageUrl === finding.pageUrl && interaction.result === "FAIL");

const rootCauseForType = (finding: RuntimeFinding, interaction?: InteractionResult) => {
  const evidenceText = `${finding.summary} ${finding.details} ${finding.evidence.join(" ")} ${interaction?.error ?? ""}`.toLowerCase();

  if (finding.type === "js_exception" || finding.type === "console_error") {
    return {
      probableRootCause: "Client-side JavaScript error or unhandled application state.",
      technicalExplanation: "The browser reported a script error while rendering or executing the page. This usually points to a failing component, missing data guard, invalid DOM assumption, or third-party script issue.",
      userImpact: "Users may see broken UI, failed actions, blank sections, or inconsistent behavior.",
      suggestedFix: "Trace the console/page error to the owning component, add defensive checks around the failing state, and add a regression test for the affected route.",
      baseConfidence: 82,
    };
  }

  if (finding.type === "request_failure" || finding.type === "api_contract") {
    return {
      probableRootCause: evidenceText.includes("500") || evidenceText.includes("5")
        ? "Backend endpoint error or unstable upstream dependency."
        : "Frontend and API contract mismatch or missing error handling.",
      technicalExplanation: "Captured API traffic returned an error, failed request, slow response, or unexpected response shape during the user flow.",
      userImpact: "The affected feature may fail to load, save, authenticate, or display reliable data.",
      suggestedFix: "Inspect the endpoint logs, validate status codes and response schema, add frontend fallback handling, and cover the endpoint with contract tests.",
      baseConfidence: 86,
    };
  }

  if (finding.type === "accessibility") {
    return {
      probableRootCause: "UI control lacks accessible metadata or keyboard-safe structure.",
      technicalExplanation: "The DOM inspection found missing labels, weak focus semantics, positive tabindex, aria-hidden focusable content, or contrast risks.",
      userImpact: "Keyboard and assistive-technology users may be blocked or may not understand how to use the interface.",
      suggestedFix: "Add accessible names, semantic labels, keyboard support, valid ARIA usage, and contrast-safe styling for the affected control.",
      baseConfidence: 78,
    };
  }

  if (finding.type === "visual_regression") {
    return {
      probableRootCause: "Responsive layout, visual state, or rendering instability.",
      technicalExplanation: "The scanner detected layout overflow, DOM state drift, or a visual snapshot that changed after interaction.",
      userImpact: "Users may see clipped content, broken layout, unstable components, or confusing state changes.",
      suggestedFix: "Review responsive constraints, loading states, container sizing, and visual regression screenshots for the affected route.",
      baseConfidence: 68,
    };
  }

  if (finding.type === "boundary_limit") {
    return {
      probableRootCause: "Missing boundary validation or weak interaction throttling.",
      technicalExplanation: "Boundary probes found input, rapid-click, pagination, upload, or state handling that did not show a clear protection signal.",
      userImpact: "Users can trigger invalid data, duplicate actions, or edge states that produce inconsistent behavior.",
      suggestedFix: "Add validation limits, debouncing, disabled submit states, server-side validation, and boundary regression tests.",
      baseConfidence: 66,
    };
  }

  return {
    probableRootCause: "Application behavior did not match expected quality signals.",
    technicalExplanation: "The crawler correlated finding details with interaction, API, and page evidence but did not identify a single specific subsystem.",
    userImpact: "The affected user journey may behave unpredictably and should be reviewed.",
    suggestedFix: "Reproduce the issue from the captured route, inspect the related logs/evidence, and add a focused regression test after fixing.",
    baseConfidence: 58,
  };
};

export const analyzeRootCauses = (analysis: FrontendAnalysis): RootCauseAnalysis[] =>
  analysis.runtimeFindings.map((finding) => {
    const interaction = findRelatedInteraction(finding, analysis.interactionResults);
    const template = rootCauseForType(finding, interaction);
    const evidence = [
      ...finding.evidence.slice(0, 5),
      finding.screenshotUrl ? `Screenshot: ${finding.screenshotUrl}` : "",
      interaction?.error ? `Interaction error: ${interaction.error}` : "",
      interaction?.domDiffSummary ? `DOM diff: ${interaction.domDiffSummary}` : "",
    ].filter(Boolean);

    const confidenceBoost =
      (finding.screenshotUrl ? 5 : 0) +
      (interaction?.error ? 6 : 0) +
      (finding.evidence.length > 2 ? 4 : 0);

    return {
      findingId: finding.findingId,
      probableRootCause: template.probableRootCause,
      technicalExplanation: template.technicalExplanation,
      userImpact: template.userImpact,
      suggestedFix: template.suggestedFix,
      confidenceScore: clampConfidence(template.baseConfidence + confidenceBoost),
      evidence,
    };
  });
