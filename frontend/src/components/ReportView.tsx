import { useMemo, useState } from "react";
import { EmptyStatePanel } from "./EmptyStatePanel";
import type { AnalysisResponse, GlobalFilters } from "../types/analysis";

type ReportViewProps = {
  result: AnalysisResponse | null;
  filters: GlobalFilters;
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
    baseUrl: "",
    pages: [],
    warnings: [],
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

export function ReportView({ result, filters }: ReportViewProps) {
  const [section, setSection] = useState<SectionKey>("summary");
  const [showFlowchartSource, setShowFlowchartSource] = useState(false);
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
        description="Report view becomes available after a completed run with flow, findings, and backend correlation."
        actionLabel="Next step"
        actionHint="Run a target and return here."
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

  return (
    <section className="min-w-0 grid gap-4">
      <article className="min-w-0 grid gap-4 rounded-[1.8rem] border border-white/10 bg-slate-900/72 p-5 sm:p-5 fade-in-up">
        <div className="rounded-2xl border border-cyan-300/12 bg-[linear-gradient(135deg,rgba(8,47,73,0.65)_0%,rgba(15,23,42,0.88)_100%)] p-4">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Report</p>
          <h2 className="mt-3 break-words text-2xl font-semibold text-white">Interpreted scan report</h2>
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
          <ReportStat label="Confidence" value={confidence.level} hint={confidence.summary} />
          <ReportStat
            label="Highest-risk route"
            value={topRiskRoute?.route ?? "--"}
            hint={topRiskRoute ? `${topRiskRoute.findings} visible findings` : "No route concentration"}
          />
          <ReportStat
            label="Dominant issue type"
            value={dominantType?.label ?? "--"}
            hint={dominantType ? `${dominantType.count} visible finding${dominantType.count === 1 ? "" : "s"}` : "No type concentration"}
          />
          <ReportStat
            label="Backend correlation"
            value={result.backendValidation.provided ? "Linked" : "None"}
            hint={
              result.backendValidation.provided
                ? `${result.backendValidation.matchedEndpoints.length} matched, ${mismatchedEndpoints.length} mismatched`
                : "Frontend-only evidence"
            }
          />
        </div>

        {section === "summary" ? (
          <div className="min-w-0 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Executive summary"
                title={result.report.overview?.summary ?? "This run has been converted into a structured report."}
                description="This section connects coverage, failures, backend correlation, and likely user impact so the report reads as a decision document instead of raw telemetry."
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
              </div>
              {result.report.overview?.details?.length ? (
                <DetailList title={result.report.overview.title} items={result.report.overview.details.slice(0, 6)} />
              ) : null}
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Methodology"
                title={`Confidence: ${confidence.level}`}
                description={confidence.summary}
              />
              <DetailList title="How to read this report" items={methodology} />
              <DetailList title="Confidence drivers" items={confidence.reasons} />
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up xl:col-span-2">
              <SectionHeader
                eyebrow="Recommended next actions"
                title="What to do next"
                description="These actions are prioritized from the current run evidence, filter state, and backend/frontend correlations."
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
                description="This view groups visible findings and recurring failure clusters by route so you can judge where user impact concentrates."
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
                    description="Visible findings do not currently cluster around a specific route in this report slice."
                    actionLabel="Try"
                    actionHint="Broaden filters or run a deeper pass."
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
                description="The flow view shows how the crawler moved between pages, where transitions failed, and which paths were actually exercised."
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
                  description="The current route or status filters removed the visible steps from this report slice."
                  actionLabel="Try"
                  actionHint="Reset filters or switch route."
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
                description="This section helps distinguish between isolated frontend breakage and issues that also point to API contract or route ownership problems."
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
                description="Mismatched endpoints are useful when the UI appears functional but the request shape, response behavior, or route ownership does not line up cleanly."
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
                description="Each finding is summarized with severity, route, and evidence count so reviewers can understand what is user-visible and what still needs deeper validation."
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
                    description="The report is available, but the current severity, route, or type filters removed the visible findings."
                    actionLabel="Try"
                    actionHint="Broaden filters for a wider report."
                    tone="active"
                  />
                )}
              </div>
            </article>

            <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
              <SectionHeader
                eyebrow="Issue context"
                title="Why these findings matter"
                description="This side panel turns the filtered finding set into route-level risk, recurring cluster context, and report issue notes."
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
                description="This section makes it easier to separate UX breakage from slow or failing backend behavior."
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
                description="Failing assertions often explain why interface defects appear inconsistent, blocked, or incomplete to the user."
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
          </div>
        ) : null}

        {section === "outline" ? (
          <article className="min-w-0 grid gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4 fade-in-up">
            <SectionHeader
              eyebrow="Documentation outline"
              title="Packaged report structure"
              description="This outline shows how the report is organized for handoff, PDF packaging, or stakeholder review."
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

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{eyebrow}</p>
      <h3 className="mt-2 break-words text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 break-words text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}

function ReportStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 break-words text-xs text-slate-400">{hint}</p>
    </div>
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
