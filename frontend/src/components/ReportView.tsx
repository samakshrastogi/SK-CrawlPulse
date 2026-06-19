import { useMemo, useState } from "react";
import { runtime } from "../config/runtime";
import { EmptyStatePanel } from "./EmptyStatePanel";
import type { AnalysisResponse, AnalysisRun, GlobalFilters } from "../types/analysis";

type ReportViewProps = {
  result: AnalysisResponse | null;
  currentRun: AnalysisRun | null;
  filters: GlobalFilters;
  userEmail: string;
};

type SectionKey = "summary" | "flow" | "backend" | "findings" | "performance" | "outline";

type RouteRisk = {
  route: string;
  findings: number;
  high: number;
  medium: number;
  low: number;
  clusters: number;
  impact: string;
};

const sections: Array<{ key: SectionKey; label: string }> = [
  { key: "summary", label: "Summary" },
  { key: "flow", label: "Flow" },
  { key: "backend", label: "Backend" },
  { key: "findings", label: "Findings" },
  { key: "performance", label: "Performance" },
  { key: "outline", label: "Outline" },
];

const EMPTY_RESULT: AnalysisResponse = {
  runId: "",
  frontend: {
    interactiveElements: [],
    navigationGraph: [],
    coverageReport: {
      total_buttons: 0,
      tested: 0,
      passed: 0,
      failed: 0,
      coverage: "0%",
    },
    interactionResults: [],
    failureClusters: [],
    runtimeFindings: [],
    apiAssertions: [],
    securityFindings: [],
    coverageScore: {
      pagesDiscovered: 0,
      pagesTested: 0,
      formsDetected: 0,
      formsTested: 0,
      buttonsDetected: 0,
      buttonsTested: 0,
      linksDetected: 0,
      linksValidated: 0,
      mobileDevicesTested: [],
      apiEndpointsObserved: 0,
      apiEndpointsAnalyzed: 0,
      overallScore: 0,
    },
    rootCauseAnalyses: [],
    baseUrl: "",
    pages: [],
    warnings: [],
    mobileComparison: undefined,
  },
  testCases: [],
  backendValidation: {
    provided: false,
    matchedEndpoints: [],
    mismatchedEndpoints: [],
    observations: [],
  },
  report: {
    mermaidFlowchart: "",
    pdfOutline: [],
  },
};

const appendEmailQuery = (url: string, email: string) =>
  email ? `${url}${url.includes("?") ? "&" : "?"}email=${encodeURIComponent(email)}` : url;

export function ReportView({ result, currentRun, filters, userEmail }: ReportViewProps) {
  const [section, setSection] = useState<SectionKey>("summary");
  const [showFlowchartSource, setShowFlowchartSource] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const safeResult = result ?? EMPTY_RESULT;

  const flowSteps = useMemo(
    () =>
      safeResult.frontend.navigationGraph.filter((step) => {
        const routeOk = filters.route === "all" || shortLabel(step.from) === filters.route;
        const statusOk = filters.status === "all" || (step.result ?? "PASS") === filters.status;
        return routeOk && statusOk;
      }),
    [filters.route, filters.status, safeResult],
  );

  const findings = useMemo(
    () =>
      safeResult.frontend.runtimeFindings.filter((finding) => {
        const severityOk = filters.severity === "all" || finding.severity === filters.severity;
        const typeOk = filters.issueType === "all" || finding.type === filters.issueType;
        const routeOk = filters.route === "all" || shortLabel(finding.pageUrl) === filters.route;
        return severityOk && typeOk && routeOk;
      }),
    [filters.issueType, filters.route, filters.severity, safeResult],
  );

  const severityCounts = useMemo(
    () => ({
      high: findings.filter((finding) => finding.severity === "high").length,
      medium: findings.filter((finding) => finding.severity === "medium").length,
      low: findings.filter((finding) => finding.severity === "low").length,
    }),
    [findings],
  );

  const routeRisks = useMemo(() => buildRouteRisk(safeResult, findings), [findings, safeResult]);

  if (!result) {
    return (
      <EmptyStatePanel
        title="No report yet"
        actionLabel="Next step"
        tone="warn"
      />
    );
  }

  const failureClusters = result.frontend.failureClusters;
  const apiAssertions = result.frontend.apiAssertions;
  const failingAssertions = apiAssertions.filter((assertion) => !assertion.passed);
  const warnings = result.frontend.warnings;
  const backendObservations = result.backendValidation.observations;
  const mismatchedEndpoints = result.backendValidation.mismatchedEndpoints ?? [];
  const coverage = result.frontend.coverageReport;
  const coverageScore = result.frontend.coverageScore;
  const topRiskRoute = routeRisks[0];
  const dominantType = getTopLabel(findings.map((finding) => finding.type));
  const confidence = deriveConfidence(result);
  const methodology = buildMethodology(result);
  const recommendations = buildRecommendations(result, {
    findings,
    routeRisks,
    failingAssertions,
    mismatchedEndpoints,
  });
  const executiveSummary = buildExecutiveSummary(result, {
    findings,
    routeRisks,
    failingAssertions,
    mismatchedEndpoints,
  });
  const qualityGate = buildQualityGate(result);
  const exportBaseUrl = `${runtime.apiBaseUrl}${runtime.analysisApiPath}/runs/${result.runId}/export`;
  const exportUrl = (kind: "html" | "json" | "playwright" | "pdf") =>
    appendEmailQuery(`${exportBaseUrl}/${kind}`, userEmail);
  const canDownloadPdf = currentRun?.status === "completed" && Boolean(result.runId);

  const downloadPdfReport = async () => {
    if (!canDownloadPdf) {
      return;
    }

    setPdfLoading(true);
    setPdfError("");
    try {
      const response = await fetch(exportUrl("pdf"));
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Report generation failed.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SK-CrawlPulse-Report-${result.runId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setPdfError(error instanceof Error ? error.message : "Report generation failed.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <section className="min-w-0 grid gap-4">
      <article className="min-w-0 grid gap-4 rounded-[1.8rem] border border-white/10 bg-slate-900/72 p-5 sm:p-5 fade-in-up">
        <div className="rounded-2xl border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,47,73,0.65)_0%,rgba(15,23,42,0.88)_100%)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Report</p>
              <h2 className="mt-3 break-words text-2xl font-semibold text-white">Interpreted scan report</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportButton href={exportUrl("html")} label="HTML report" />
              <ExportButton href={exportUrl("json")} label="JSON package" />
              <ExportButton href={exportUrl("playwright")} label="Playwright spec" />
            </div>
          </div>
          <p className="mt-3 max-w-4xl break-words text-sm leading-7 text-slate-300">{executiveSummary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sections.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`tab-motion rounded-full border px-3 py-2 text-xs ${
                  section === key ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <ReportStat label="Quality gate" value={qualityGate.label} />
        <ReportStat label="Confidence" value={confidence.level} />
        <ReportStat
          label="Highest-risk route"
          value={topRiskRoute?.route ?? "--"}
        />
        <ReportStat
          label="Dominant issue type"
          value={dominantType?.label ?? "--"}
        />
        <ReportStat label="Coverage score" value={`${coverageScore.overallScore}/100`} />
        <ReportStat label="Devices tested" value={coverageScore.mobileDevicesTested.join(", ") || "--"} />
      </div>

        <article className="min-w-0 rounded-2xl border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(8,47,73,0.5)_0%,rgba(15,23,42,0.9)_100%)] p-4 fade-in-up">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Professional PDF Report</p>
              <h3 className="mt-2 break-words text-lg font-semibold text-white">Download a stakeholder-ready website testing report</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Download a complete website testing report designed for both technical and non-technical stakeholders.
              </p>
              {pdfError ? (
                <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-100">
                  {pdfError}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={downloadPdfReport}
              disabled={!canDownloadPdf || pdfLoading}
              className="tab-motion min-h-[44px] shrink-0 rounded-full border border-cyan-300/25 bg-cyan-400/12 px-5 py-3 text-sm font-semibold text-cyan-100 shadow-[0_12px_30px_rgba(34,211,238,0.12)] transition hover:bg-cyan-400/18 disabled:cursor-not-allowed disabled:opacity-45"
              title={canDownloadPdf ? "Download PDF Report" : "Run must be completed before report download"}
            >
              {pdfLoading ? "Generating Report..." : canDownloadPdf ? "Download PDF Report" : "Run must be completed before report download"}
            </button>
          </div>
        </article>

        {section === "summary" ? (
          <div className="min-w-0 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Executive summary"
                title={result.report.overview?.summary ?? "This run has been converted into a structured report."}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <InsightCard
                  title="Scope covered"
                  text={`${result.frontend.pages.length} pages, ${result.frontend.interactionResults.length} interaction checks, and ${coverage.tested}/${coverage.total_buttons} target buttons exercised.`}
                />
                <InsightCard
                  title="Risk posture"
                  text={`${severityCounts.high} high, ${severityCounts.medium} medium, and ${severityCounts.low} low visible findings with ${failureClusters.length} recurring failure cluster${failureClusters.length === 1 ? "" : "s"}.`}
                />
                <InsightCard
                  title="Backend health"
                  text={
                    result.backendValidation.provided
                      ? `${result.backendValidation.matchedEndpoints.length} endpoint match${result.backendValidation.matchedEndpoints.length === 1 ? "" : "es"} and ${mismatchedEndpoints.length} mismatch${mismatchedEndpoints.length === 1 ? "" : "es"} were observed.`
                      : "No backend validation input was provided, so this report relies on frontend runtime evidence."
                  }
                />
                <InsightCard
                  title="Immediate focus"
                  text={recommendations[0] ?? "No urgent next action was inferred from the current report slice."}
                />
                <InsightCard
                  title="Security posture"
                  text={result.frontend.securityFindings.length > 0 ? `${result.frontend.securityFindings.length} API security finding${result.frontend.securityFindings.length === 1 ? "" : "s"} were detected.` : "No API security signals were generated from the current crawl."}
                />
              </div>
              <DetailList title={`Quality gate: ${qualityGate.label}`} items={qualityGate.reasons} />
              {result.report.overview?.details?.length ? (
                <DetailList title={result.report.overview.title} items={result.report.overview.details.slice(0, 6)} />
              ) : null}
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Methodology"
                title={`Confidence: ${confidence.level}`}
              />
              <DetailList title="How to read this report" items={methodology} />
              <DetailList title="Confidence drivers" items={confidence.reasons} />
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up xl:col-span-2">
              <SectionHeader
                eyebrow="Recommended next actions"
                title="What to do next"
              />
              <div className="grid gap-2">
                {recommendations.map((item, index) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
                    <span className="mr-2 text-cyan-200">{index + 1}.</span>
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up xl:col-span-2">
              <SectionHeader
                eyebrow="Route risk"
                title="Which routes deserve attention first"
              />
              <div className="grid gap-3 md:grid-cols-2">
                {routeRisks.length > 0 ? (
                  routeRisks.slice(0, 6).map((item) => (
                    <article key={item.route} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 break-all text-sm font-semibold text-white">{item.route}</p>
                        <span className={`rounded-full border px-3 py-1 text-xs ${routeRiskTone(item)}`}>{item.impact}</span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <CompactMetric label="Visible findings" value={String(item.findings)} />
                        <CompactMetric label="Recurring clusters" value={String(item.clusters)} />
                        <CompactMetric label="High severity" value={String(item.high)} />
                        <CompactMetric label="Medium severity" value={String(item.medium)} />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {buildRouteNarrative(item)}
                      </p>
                    </article>
                  ))
                ) : (
                  <EmptyStatePanel
                    title="No route concentration"
                    actionLabel="Try"
                    tone="pass"
                  />
                )}
              </div>
            </article>
          </div>
        ) : null}

        {section === "flow" ? (
          <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeader
                eyebrow="Flow map"
                title="Observed navigation transitions"
              />
              <button
                type="button"
                onClick={() => setShowFlowchartSource((value) => !value)}
                className="tab-motion shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
              >
                {showFlowchartSource ? "Hide flowchart TD" : "Show flowchart TD"}
              </button>
            </div>
            {showFlowchartSource ? <FlowchartPreview source={result.report.mermaidFlowchart} /> : null}
            <div className="grid gap-3">
              {flowSteps.length > 0 ? (
                flowSteps.slice(0, 12).map((step, index) => (
                  <div
                    key={`${step.from}-${step.action}-${index}`}
                    className={`rounded-2xl border p-3 fade-in-up ${(step.result ?? "PASS") === "FAIL" ? "semantic-fail" : "semantic-pass"}`}
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                      <FlowNode label="From" value={shortLabel(step.from)} />
                      <div className="flex items-center justify-center">
                        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200 live-update">
                          {step.action}
                        </span>
                      </div>
                      <FlowNode label={step.result ?? "Result"} value={shortLabel(step.to)} />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyStatePanel
                  title="No flow matches"
                  actionLabel="Try"
                  tone="warn"
                />
              )}
            </div>
          </article>
        ) : null}

        {section === "backend" ? (
          <div className="min-w-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Backend correlation"
                title={result.backendValidation.provided ? "Frontend and backend evidence were correlated" : "No backend correlation was provided"}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <CompactMetric label="Matched endpoints" value={String(result.backendValidation.matchedEndpoints.length)} />
                <CompactMetric label="Mismatched endpoints" value={String(mismatchedEndpoints.length)} />
              </div>
              <DetailList
                title="Observations"
                items={
                  backendObservations.length > 0
                    ? backendObservations.slice(0, 8)
                    : ["No backend observations were recorded for this run."]
                }
              />
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Mismatch review"
                title="Where the contract looks weak"
              />
              <div className="grid gap-2">
                {mismatchedEndpoints.length > 0 ? (
                  mismatchedEndpoints.slice(0, 8).map((item) => (
                    <div key={item} className="rounded-2xl border border-rose-300/18 bg-[linear-gradient(135deg,rgba(63,28,45,0.58)_0%,rgba(15,23,42,0.82)_100%)] px-4 py-3 text-sm text-rose-100 break-all">
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                    No backend mismatches were recorded in the current report.
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                {result.backendValidation.matchedEndpoints.slice(0, 6).map((item) => (
                  <div key={item} className="rounded-2xl border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(6,78,59,0.44)_0%,rgba(15,23,42,0.82)_100%)] px-4 py-3 text-sm text-emerald-100 break-all">
                    {item}
                  </div>
                ))}
              </div>
            </article>
          </div>
        ) : null}

        {section === "findings" ? (
          <div className="min-w-0 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Filtered findings"
                title={result.report.issues?.summary ?? "Visible issues in the current report slice"}
              />
              <div className="grid gap-3">
                {findings.length > 0 ? (
                  findings.slice(0, 10).map((finding) => (
                    <div key={finding.findingId} className={`min-w-0 overflow-hidden rounded-2xl border px-4 py-4 fade-in-up ${severityShell(finding.severity)}`}>
                      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 break-words pr-3 text-sm font-medium text-white">{finding.summary}</p>
                        <span className={`shrink-0 text-xs uppercase ${severityText(finding.severity)}`}>{finding.severity}</span>
                      </div>
                      <p className="mt-2 break-all text-xs text-slate-400">
                        {finding.type} • {shortLabel(finding.pageUrl)} • {finding.evidence.length} evidence item{finding.evidence.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-3 break-words text-sm leading-6 text-slate-300">{finding.details}</p>
                    </div>
                  ))
                ) : (
                  <EmptyStatePanel
                    title="No findings in this slice"
                    actionLabel="Try"
                    tone="active"
                  />
                )}
              </div>
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Issue context"
                title="Why these findings matter"
              />
              <DetailList
                title={result.report.issues?.title ?? "Issue notes"}
                items={
                  result.report.issues?.details?.length
                    ? result.report.issues.details.slice(0, 10)
                    : ["No structured issue notes were generated for this run."]
                }
              />
            </article>
          </div>
        ) : null}

        {section === "performance" ? (
          <div className="min-w-0 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Performance and API"
                title={result.report.performance?.summary ?? "Live API assertions and runtime response behavior"}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <CompactMetric label="API assertions" value={String(apiAssertions.length)} />
                <CompactMetric label="Failing assertions" value={String(failingAssertions.length)} />
                <CompactMetric label="Warnings" value={String(warnings.length)} />
              </div>
              <DetailList
                title={result.report.performance?.title ?? "Performance notes"}
                items={
                  result.report.performance?.details?.length
                    ? result.report.performance.details.slice(0, 8)
                    : ["No API assertion detail lines were generated for this run."]
                }
              />
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Assertion review"
                title="Responses that need investigation"
              />
              <div className="grid gap-2">
                {failingAssertions.length > 0 ? (
                  failingAssertions.slice(0, 8).map((assertion, index) => (
                    <div key={`${assertion.method}-${assertion.url}-${index}`} className="min-w-0 overflow-hidden rounded-2xl border border-amber-300/18 bg-[linear-gradient(135deg,rgba(120,53,15,0.42)_0%,rgba(15,23,42,0.82)_100%)] px-4 py-3">
                      <p className="text-sm font-medium text-white break-all">
                        {assertion.method} {assertion.url}
                      </p>
                      <p className="mt-2 break-words text-xs text-amber-100">
                        Status {assertion.status ?? "n/a"} • {assertion.issues.join(", ")}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
                    No failing API assertions are visible in this report slice.
                  </div>
                )}
              </div>
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up xl:col-span-2">
              <SectionHeader
                eyebrow="Coverage and device drift"
                title="How much of the surface was exercised"
              />
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <CompactMetric label="Pages" value={`${coverageScore.pagesTested}/${coverageScore.pagesDiscovered}`} />
                <CompactMetric label="Forms" value={`${coverageScore.formsTested}/${coverageScore.formsDetected}`} />
                <CompactMetric label="Buttons" value={`${coverageScore.buttonsTested}/${coverageScore.buttonsDetected}`} />
                <CompactMetric label="Links" value={`${coverageScore.linksValidated}/${coverageScore.linksDetected}`} />
              </div>
              <DetailList
                title="Device comparison"
                items={
                  result.frontend.mobileComparison
                    ? [
                        result.frontend.mobileComparison.summary,
                        `Common issues: ${result.frontend.mobileComparison.commonIssueIds.length}`,
                        ...result.frontend.mobileComparison.deviceOnlyIssues.map(
                          (item) => `${item.deviceName}: ${item.findingIds.length} device-specific issue${item.findingIds.length === 1 ? "" : "s"}`,
                        ),
                      ]
                    : ["No mobile comparison was produced for this run."]
                }
              />
            </article>
          </div>
        ) : null}

        {section === "outline" ? (
          <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
            <SectionHeader
              eyebrow="Documentation outline"
              title="Packaged report structure"
            />
            <div className="grid gap-3">
              {result.report.pdfOutline.slice(0, 8).map((item, index) => (
                <div key={item} className="min-w-0 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                    {index + 1}
                  </span>
                  <p className="min-w-0 break-words text-sm text-slate-200">{item}</p>
                </div>
              ))}
            </div>
          </article>
        ) : null}
      </article>
    </section>
  );
}

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{eyebrow}</p>
      <h3 className="mt-2 break-words text-lg font-semibold text-white">{title}</h3>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function ExportButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="tab-motion rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100 hover:bg-cyan-400/15"
    >
      {label}
    </a>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="break-words text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 break-words text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0 grid gap-2 overflow-hidden">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{title}</p>
      {items.map((item, index) => (
        <div
          key={`${title}-${index}-${item}`}
          className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300 break-all"
        >
          {item}
        </div>
      ))}
    </div>
  );
}

function FlowNode({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function FlowchartPreview({ source }: { source: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mermaid source</p>
      <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-300">
        {source || "No flowchart source was generated for this run."}
      </pre>
    </div>
  );
}

function buildExecutiveSummary(
  result: AnalysisResponse,
  details: {
    findings: AnalysisResponse["frontend"]["runtimeFindings"];
    routeRisks: RouteRisk[];
    failingAssertions: AnalysisResponse["frontend"]["apiAssertions"];
    mismatchedEndpoints: string[];
  },
) {
  const coverage = result.frontend.coverageReport;
  const topRoute = details.routeRisks[0];
  const backendSentence = result.backendValidation.provided
    ? `${result.backendValidation.matchedEndpoints.length} backend endpoint match${result.backendValidation.matchedEndpoints.length === 1 ? "" : "es"} and ${details.mismatchedEndpoints.length} mismatch${details.mismatchedEndpoints.length === 1 ? "" : "es"} were correlated.`
    : "No backend validation was supplied, so conclusions are based on frontend runtime evidence only.";

  return `This run covered ${result.frontend.pages.length} page${result.frontend.pages.length === 1 ? "" : "s"} and ${result.frontend.interactionResults.length} interaction check${result.frontend.interactionResults.length === 1 ? "" : "s"}, reaching ${coverage.coverage} button coverage. ${
    details.findings.length > 0
      ? `${details.findings.length} visible finding${details.findings.length === 1 ? "" : "s"} remain in the current filter set`
      : "No findings are visible in the current filter set"
  }${topRoute ? `, with the heaviest concentration on ${topRoute.route}` : ""}. ${details.failingAssertions.length > 0 ? `${details.failingAssertions.length} API assertion${details.failingAssertions.length === 1 ? "" : "s"} failed, which may be driving user-facing instability. ` : ""}${backendSentence}`;
}

function buildMethodology(result: AnalysisResponse) {
  const coverage = result.frontend.coverageReport;
  return [
    `Coverage is estimated from ${coverage.tested} exercised target button${coverage.tested === 1 ? "" : "s"} out of ${coverage.total_buttons}.`,
    `Runtime findings are drawn from live interactions, accessibility checks, boundary probes, console errors, and route traversal evidence.`,
    `Recurring failure clusters represent repeated patterns across pages or interactions, which usually deserve more attention than isolated one-off defects.`,
    result.backendValidation.provided
      ? "Backend observations combine live frontend API traffic with backend route validation signals."
      : "Backend context is absent, so API and ownership conclusions are less certain.",
  ];
}

function buildRecommendations(
  result: AnalysisResponse,
  details: {
    findings: AnalysisResponse["frontend"]["runtimeFindings"];
    routeRisks: RouteRisk[];
    failingAssertions: AnalysisResponse["frontend"]["apiAssertions"];
    mismatchedEndpoints: string[];
  },
) {
  const items = [
    details.routeRisks[0]
      ? `Inspect ${details.routeRisks[0].route} first because it carries the highest visible route risk in this report slice.`
      : null,
    details.findings.find((finding) => finding.severity === "high")
      ? "Triage high-severity findings before medium and low issues because they are the most likely to block user journeys."
      : null,
    details.failingAssertions.length > 0
      ? `Review ${details.failingAssertions.length} failing API assertion${details.failingAssertions.length === 1 ? "" : "s"} to confirm whether frontend defects are symptoms of backend response problems.`
      : null,
    details.mismatchedEndpoints.length > 0
      ? `Validate the ${details.mismatchedEndpoints.length} mismatched endpoint${details.mismatchedEndpoints.length === 1 ? "" : "s"} against expected request and response contracts.`
      : null,
    result.frontend.failureClusters.length > 0
      ? `Convert the ${result.frontend.failureClusters.length} recurring failure cluster${result.frontend.failureClusters.length === 1 ? "" : "s"} into targeted regression coverage.`
      : null,
    result.frontend.coverageReport.failed > 0
      ? `Review the ${result.frontend.coverageReport.failed} failed interaction check${result.frontend.coverageReport.failed === 1 ? "" : "s"} in Tests to confirm reproducibility.`
      : null,
  ].filter((item): item is string => Boolean(item));

  return items.length > 0 ? items : ["No urgent follow-up was inferred from the current report slice."];
}

function buildRouteRisk(result: AnalysisResponse, findings: AnalysisResponse["frontend"]["runtimeFindings"]): RouteRisk[] {
  const clusters = result.frontend.failureClusters;
  const routes = new Map<string, RouteRisk>();

  findings.forEach((finding) => {
    const route = shortLabel(finding.pageUrl);
    const existing = routes.get(route) ?? {
      route,
      findings: 0,
      high: 0,
      medium: 0,
      low: 0,
      clusters: 0,
      impact: "Lower priority",
    };

    existing.findings += 1;
    if (finding.severity === "high") {
      existing.high += 1;
    } else if (finding.severity === "medium") {
      existing.medium += 1;
    } else {
      existing.low += 1;
    }
    routes.set(route, existing);
  });

  clusters.forEach((cluster) => {
    cluster.pages.forEach((page) => {
      const route = shortLabel(page);
      const existing = routes.get(route) ?? {
        route,
        findings: 0,
        high: 0,
        medium: 0,
        low: 0,
        clusters: 0,
        impact: "Lower priority",
      };
      existing.clusters += 1;
      routes.set(route, existing);
    });
  });

  return Array.from(routes.values())
    .map((item) => ({
      ...item,
      impact: item.high > 0 ? "Needs attention now" : item.medium > 0 || item.clusters > 0 ? "Should review" : "Lower priority",
    }))
    .sort((left, right) => {
      const leftWeight = left.high * 10 + left.medium * 5 + left.clusters * 3 + left.findings;
      const rightWeight = right.high * 10 + right.medium * 5 + right.clusters * 3 + right.findings;
      return rightWeight - leftWeight || left.route.localeCompare(right.route);
    });
}

function buildRouteNarrative(item: RouteRisk) {
  if (item.high > 0) {
    return `${item.route} contains ${item.high} high-severity issue${item.high === 1 ? "" : "s"}, so this route is likely to carry immediate user-facing risk.`;
  }
  if (item.medium > 0 || item.clusters > 0) {
    return `${item.route} shows repeated or medium-severity signals, which makes it a good candidate for focused verification and regression coverage.`;
  }
  return `${item.route} has lower-severity visible issues, so it can usually be reviewed after higher-risk routes are stabilized.`;
}

function deriveConfidence(result: AnalysisResponse) {
  const reasons: string[] = [];
  const pageCount = result.frontend.pages.length;
  const interactionCount = result.frontend.interactionResults.length;
  const testedButtons = result.frontend.coverageReport.tested;
  const backendProvided = result.backendValidation.provided;

  if (pageCount >= 5) {
    reasons.push("Multiple routes were discovered, which improves coverage confidence.");
  } else {
    reasons.push("Only a limited route set was captured, so conclusions may still reflect partial coverage.");
  }

  if (interactionCount >= 10) {
    reasons.push("A meaningful number of interaction checks completed, which strengthens behavior evidence.");
  } else {
    reasons.push("Interaction depth is still shallow, so some user journeys may be underrepresented.");
  }

  if (testedButtons >= 10) {
    reasons.push("Button coverage is broad enough to support route-level prioritization.");
  } else {
    reasons.push("The crawl exercised a limited number of target buttons, so route confidence remains moderate.");
  }

  if (backendProvided) {
    reasons.push("Backend correlation was available, which improves confidence in API-related conclusions.");
  } else {
    reasons.push("Backend correlation was not available, so API ownership and contract conclusions are weaker.");
  }

  if (pageCount >= 5 && interactionCount >= 10 && testedButtons >= 10 && backendProvided) {
    return {
      level: "High",
      summary: "The report has enough route, interaction, and backend evidence to support stronger conclusions.",
      reasons,
    };
  }

  if (pageCount >= 3 && interactionCount >= 5) {
    return {
      level: "Medium",
      summary: "The report is useful for prioritization, but some routes or interaction paths may still be undercovered.",
      reasons,
    };
  }

  return {
    level: "Low",
    summary: "The report is directionally useful, but it should be treated as partial evidence until coverage deepens.",
    reasons,
  };
}

function buildQualityGate(result: AnalysisResponse) {
  const highFindings = result.frontend.runtimeFindings.filter((finding) => finding.severity === "high").length;
  const failedInteractions = result.frontend.coverageReport.failed;
  const coverage = Number.parseInt(result.frontend.coverageReport.coverage, 10) || 0;
  const reasons = [
    highFindings > 0 ? `${highFindings} high-severity finding${highFindings === 1 ? "" : "s"} detected.` : null,
    failedInteractions > 0 ? `${failedInteractions} failed interaction check${failedInteractions === 1 ? "" : "s"} detected.` : null,
    coverage < 80 ? `Coverage is ${coverage}%, below the recommended 80% gate.` : null,
  ].filter((item): item is string => Boolean(item));

  return {
    label: reasons.length > 0 ? "Needs review" : "Passed",
    reasons:
      reasons.length > 0
        ? reasons
        : ["No high-severity findings, failed interactions, or low coverage gate failures."],
  };
}

function getTopLabel(items: string[]) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))[0];
}

function routeRiskTone(item: RouteRisk) {
  if (item.high > 0) {
    return "border-rose-300/20 bg-rose-400/10 text-rose-200";
  }
  if (item.medium > 0 || item.clusters > 0) {
    return "border-amber-300/20 bg-amber-400/10 text-amber-200";
  }
  return "border-cyan-300/20 bg-cyan-400/10 text-cyan-200";
}

function severityShell(severity: "low" | "medium" | "high") {
  if (severity === "high") {
    return "semantic-fail";
  }
  if (severity === "medium") {
    return "semantic-warn";
  }
  return "semantic-active";
}

function severityText(severity: "low" | "medium" | "high") {
  if (severity === "high") {
    return "text-rose-200";
  }
  if (severity === "medium") {
    return "text-amber-200";
  }
  return "text-cyan-200";
}

function shortLabel(value: string) {
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value;
  }
}
