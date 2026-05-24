import type { AnalysisRequest, BackendValidationResult, FrontendAnalysis } from "../../types/platform";

const detectApiEndpoints = (analysis: FrontendAnalysis): string[] =>
  analysis.networkRequests
    .filter((request) => /fetch|xhr|document/.test(request.resourceType))
    .map((request) => {
      try {
        return new URL(request.url).pathname;
      } catch {
        return request.url;
      }
    })
    .filter((value, index, all) => all.indexOf(value) === index);

export const validateBackendInput = (
  request: AnalysisRequest,
  analysis: FrontendAnalysis,
): BackendValidationResult => {
  const provided = Boolean(request.backend?.githubRepoUrl || request.backend?.uploadedPath);
  const matchedEndpoints = detectApiEndpoints(analysis);
  const ownershipSignals: string[] = [];
  const observations: string[] = [];
  const mismatchedEndpoints = analysis.apiAssertions
    .filter((assertion) => !assertion.passed)
    .map((assertion) => assertion.url);

  if (request.backend?.githubRepoUrl) {
    ownershipSignals.push(`Backend repository provided: ${request.backend.githubRepoUrl}`);
  }

  if (request.backend?.uploadedPath) {
    ownershipSignals.push(`Backend upload path provided: ${request.backend.uploadedPath}`);
  }

  if (matchedEndpoints.length > 0) {
    observations.push("Frontend issued API traffic that can be validated against backend routes.");
  } else {
    observations.push("No API traffic was observed during the crawl.");
  }

  const failingAssertions = analysis.apiAssertions.filter((assertion) => !assertion.passed);
  if (failingAssertions.length > 0) {
    observations.push(`${failingAssertions.length} API assertion(s) failed on status, schema inference, or latency.`);
  }

  const runtimeApiFindings = analysis.runtimeFindings.filter((finding) => finding.type === "api_contract");
  if (runtimeApiFindings.length > 0) {
    observations.push("Frontend/backend contract mismatches were inferred from live network behavior.");
  }

  return {
    provided,
    ownershipSignals,
    matchedEndpoints,
    mismatchedEndpoints,
    observations,
  };
};
