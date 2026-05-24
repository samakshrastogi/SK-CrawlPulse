export type FindingSeverity = "high" | "medium" | "low";

export type FindingMeta = {
  label: string;
  description: string;
  impact: string;
  suggestions: string[];
  evidenceLabel: string;
};

const findingMetaMap: Record<string, FindingMeta> = {
  console_error: {
    label: "Console Error",
    description: "A browser console error was emitted while the page or interaction was running.",
    impact: "Usually indicates a broken client-side code path that users may hit during normal navigation.",
    suggestions: ["Fix the underlying runtime exception.", "Add regression coverage for the failing state."],
    evidenceLabel: "Console",
  },
  js_exception: {
    label: "JavaScript Exception",
    description: "An uncaught JavaScript exception interrupted the page or user flow.",
    impact: "High risk because it can break rendering, block actions, or leave the UI in an invalid state.",
    suggestions: ["Fix the underlying runtime exception.", "Add regression coverage for the failing state."],
    evidenceLabel: "Exception",
  },
  request_failure: {
    label: "Request Failure",
    description: "A network request failed or returned an unhealthy response during execution.",
    impact: "Can block data loading, user actions, or completion states that depend on backend availability.",
    suggestions: ["Validate backend status/schema/latency in CI.", "Handle backend failures with visible fallback states."],
    evidenceLabel: "Network",
  },
  api_contract: {
    label: "API Contract Mismatch",
    description: "The frontend observed an API response or behavior that did not match expected status or structure.",
    impact: "Creates unstable UI behavior because the frontend and backend are no longer aligned on the expected contract.",
    suggestions: ["Validate backend status/schema/latency in CI.", "Handle backend failures with visible fallback states."],
    evidenceLabel: "API",
  },
  accessibility: {
    label: "Accessibility",
    description: "The page failed one or more accessibility checks related to labels, semantics, or navigation.",
    impact: "Reduces usability for keyboard and assistive technology users and can indicate broader UX quality gaps.",
    suggestions: ["Add semantic labels and predictable focus order.", "Review ARIA usage against the actual control behavior."],
    evidenceLabel: "A11y",
  },
  visual_regression: {
    label: "Visual Regression",
    description: "The UI changed in a way that suggests layout drift, overflow, or unstable presentation.",
    impact: "Users may see broken layout, clipped content, or inconsistent page states across viewport sizes.",
    suggestions: ["Constrain layout overflow and test narrow viewport states.", "Add screenshot review for this state."],
    evidenceLabel: "Visual",
  },
  boundary_limit: {
    label: "Boundary Limit",
    description: "The system showed unstable behavior around limits such as large input, repeated actions, or edge states.",
    impact: "Often appears near validation and scale boundaries where real users can trigger degraded or inconsistent behavior.",
    suggestions: ["Enforce explicit limits with validation messaging.", "Debounce repeated actions and large submissions."],
    evidenceLabel: "Boundary",
  },
};

export function getFindingMeta(type: string): FindingMeta {
  return (
    findingMetaMap[type] ?? {
      label: toTitle(type),
      description: "The scan captured a runtime issue that should be reviewed with its evidence and surrounding page state.",
      impact: "Treat this as a user-visible defect until the affected flow and evidence say otherwise.",
      suggestions: ["Review the finding and add a targeted regression test."],
      evidenceLabel: "Evidence",
    }
  );
}

export function getSeverityMeaning(severity: FindingSeverity) {
  if (severity === "high") {
    return "Likely user-blocking, data-breaking, or flow-breaking.";
  }
  if (severity === "medium") {
    return "Degrades the flow or breaks a dependency, but may have a workaround.";
  }
  return "Lower immediate risk, but still worth fixing for resilience or UX quality.";
}

function toTitle(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
