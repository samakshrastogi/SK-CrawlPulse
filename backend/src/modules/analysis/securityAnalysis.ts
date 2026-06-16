import type { ApiSecurityFinding, NetworkObservation } from "../../types/platform";

const sensitivePathPattern = /auth|login|token|session|account|user|profile|admin|payment|billing|password|secret|key/i;
const sensitivePayloadPattern = /token|password|secret|api[_-]?key|authorization|cookie|session|email|phone|ssn/i;

const endpointKey = (request: NetworkObservation) => `${request.method} ${request.url}`;
const hasHeader = (headers: Record<string, string> | undefined, pattern: RegExp) =>
  Boolean(headers && Object.keys(headers).some((key) => pattern.test(key)));

export const analyzeApiSecurity = (requests: NetworkObservation[]): ApiSecurityFinding[] => {
  const findings: ApiSecurityFinding[] = [];
  const endpointCounts = new Map<string, number>();
  const errorCounts = new Map<string, number>();

  requests.forEach((request) => {
    const key = endpointKey(request);
    endpointCounts.set(key, (endpointCounts.get(key) ?? 0) + 1);
    if (request.failed || (request.status ?? 0) >= 400) {
      errorCounts.set(key, (errorCounts.get(key) ?? 0) + 1);
    }

    const isSensitive = sensitivePathPattern.test(request.url);
    const usesHttp = request.url.startsWith("http://");
    const hasAuthHeader = hasHeader(request.requestHeaders, /authorization|cookie|x-api-key|x-auth-token/i);
    const corsOrigin = request.responseHeaders?.["access-control-allow-origin"];
    const issues: ApiSecurityFinding[] = [];

    if (usesHttp) {
      issues.push({
        securityFindingId: `sec_http_${findings.length + issues.length + 1}`,
        riskLevel: "high",
        category: "insecure_http_usage",
        requestUrl: request.url,
        method: request.method,
        pageUrl: request.pageUrl,
        status: request.status,
        evidence: ["Request used insecure HTTP instead of HTTPS."],
        remediation: "Serve API traffic over HTTPS and redirect HTTP requests to HTTPS.",
        deviceName: request.deviceName,
      });
    }

    if (isSensitive && !hasAuthHeader) {
      issues.push({
        securityFindingId: `sec_auth_${findings.length + issues.length + 1}`,
        riskLevel: "medium",
        category: "missing_authentication_headers",
        requestUrl: request.url,
        method: request.method,
        pageUrl: request.pageUrl,
        status: request.status,
        evidence: ["Sensitive-looking endpoint was observed without an authentication header signal in captured metadata."],
        remediation: "Verify that this endpoint requires authentication and that requests include authorization/session controls.",
        deviceName: request.deviceName,
      });
    }

    if (corsOrigin === "*" && isSensitive) {
      issues.push({
        securityFindingId: `sec_cors_${findings.length + issues.length + 1}`,
        riskLevel: "high",
        category: "unsafe_cors",
        requestUrl: request.url,
        method: request.method,
        pageUrl: request.pageUrl,
        status: request.status,
        evidence: ["Sensitive-looking endpoint responded with Access-Control-Allow-Origin: *."],
        remediation: "Restrict CORS origins for authenticated or sensitive endpoints and avoid wildcard origins with credentials.",
        deviceName: request.deviceName,
      });
    }

    if (isSensitive && (request.status === 200 || request.status === 204)) {
      issues.push({
        securityFindingId: `sec_sensitive_${findings.length + issues.length + 1}`,
        riskLevel: "medium",
        category: "unauthenticated_sensitive_endpoint",
        requestUrl: request.url,
        method: request.method,
        pageUrl: request.pageUrl,
        status: request.status,
        evidence: ["Sensitive-looking endpoint returned a success status during unauthenticated crawl context."],
        remediation: "Confirm access control with an authenticated and unauthenticated API test. Return 401/403 for protected data.",
        deviceName: request.deviceName,
      });
    }

    if (request.responseShape?.some((field) => sensitivePayloadPattern.test(field))) {
      issues.push({
        securityFindingId: `sec_payload_${findings.length + issues.length + 1}`,
        riskLevel: "high",
        category: "sensitive_data_exposure",
        requestUrl: request.url,
        method: request.method,
        pageUrl: request.pageUrl,
        status: request.status,
        evidence: [`Response shape included sensitive-looking fields: ${request.responseShape.join(", ")}`],
        remediation: "Remove secrets and sensitive personal data from frontend responses unless strictly required and authorized.",
        deviceName: request.deviceName,
      });
    }

    findings.push(...issues);
  });

  errorCounts.forEach((count, key) => {
    const total = endpointCounts.get(key) ?? count;
    if (count >= 3 || count / total > 0.5) {
      const [method, ...urlParts] = key.split(" ");
      findings.push({
        securityFindingId: `sec_errors_${findings.length + 1}`,
        riskLevel: "medium",
        category: "error_spike",
        requestUrl: urlParts.join(" "),
        method,
        evidence: [`${count}/${total} observed calls failed or returned 4xx/5xx.`],
        remediation: "Investigate endpoint stability, validation, authorization failures, and monitoring alerts.",
      });
    }
  });

  Array.from(endpointCounts.keys()).forEach((key) => {
    const [method, ...urlParts] = key.split(" ");
    const url = urlParts.join(" ");
    const matchingRequest = requests.find((request) => request.method === method && request.url === url);
    if (/login|auth|token|search|upload|checkout|payment/i.test(url) && !hasHeader(matchingRequest?.responseHeaders, /rate.?limit|retry-after/i)) {
      findings.push({
        securityFindingId: `sec_rate_${findings.length + 1}`,
        riskLevel: "low",
        category: "missing_rate_limit_signal",
        requestUrl: url,
        method,
        evidence: ["No rate-limit response header/signal was available in captured metadata."],
        remediation: "Confirm rate limiting on sensitive or abuse-prone endpoints and expose standard rate-limit headers where appropriate.",
        deviceName: matchingRequest?.deviceName,
      });
    }
  });

  return findings;
};
