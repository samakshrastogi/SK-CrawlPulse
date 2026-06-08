import type { AnalysisResponse } from "../types/analysis";

import { EmptyStatePanel } from "./EmptyStatePanel";

type OverviewViewProps = {
  result: AnalysisResponse | null;
};

const insightClassName = "enterprise-card fade-in-up rounded-[20px] px-5 py-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)]";

const toHeadline = (result: AnalysisResponse) => {
  const pageCount = result.frontend.pages.length;
  const interactionCount = result.frontend.interactionResults.length;
  const findingCount = result.frontend.runtimeFindings.length;
  const clusterCount = result.frontend.failureClusters.length;

  return `Scanned ${pageCount} page${pageCount === 1 ? "" : "s"}, tested ${interactionCount} interaction${
    interactionCount === 1 ? "" : "s"
  }, found ${findingCount} runtime issue${findingCount === 1 ? "" : "s"} in ${clusterCount} failure cluster${
    clusterCount === 1 ? "" : "s"
  }.`;
};

const toRouteLabel = (pageUrl: string, pages: AnalysisResponse["frontend"]["pages"]) => {
  const pageMatch = pages.find((page) => page.url === pageUrl);
  if (pageMatch?.routePath) {
    return pageMatch.routePath;
  }

  try {
    return new URL(pageUrl).pathname || pageUrl;
  } catch {
    return pageUrl;
  }
};

const severityOrder = ["high", "medium", "low"] as const;

export function OverviewView({ result }: OverviewViewProps) {
  const coverage = result?.frontend.coverageReport.coverage ?? "0%";
  const failed = result?.frontend.coverageReport.failed ?? 0;
  const tested = result?.frontend.coverageReport.tested ?? 0;
  const totalButtons = result?.frontend.coverageReport.total_buttons ?? 0;
  const issueCases = result?.testCases.filter((item) => item.status === "FAIL").length ?? 0;
  const topFindings = result?.frontend.runtimeFindings.slice(0, 5) ?? [];
  const warnings = result?.frontend.warnings ?? [];
  const pages = result?.frontend.pages ?? [];
  const interactions = result?.frontend.interactionResults ?? [];
  const failureClusters = result?.frontend.failureClusters ?? [];
  const backendValidation = result?.backendValidation;

  const severityCounts = severityOrder.map((severity) => ({
    severity,
    count: result?.frontend.runtimeFindings.filter((item) => item.severity === severity).length ?? 0,
  }));

  const topRoutes = result
    ? Object.values(
        result.frontend.runtimeFindings.reduce<Record<string, { route: string; count: number }>>((accumulator, finding) => {
          const route = toRouteLabel(finding.pageUrl, pages);
          const existing = accumulator[route];
          accumulator[route] = {
            route,
            count: (existing?.count ?? 0) + 1,
          };
          return accumulator;
        }, {}),
      )
        .sort((left, right) => right.count - left.count)
        .slice(0, 4)
    : [];

  const topSuggestions = result
    ? [
        ...failureClusters.flatMap((cluster) => cluster.suggestions),
        ...result.testCases.flatMap((testCase) => testCase.suggestions ?? []),
      ]
        .filter((item, index, all) => all.indexOf(item) === index)
        .slice(0, 5)
    : [];

  const scanNotes = result
    ? [
        warnings.length > 0 ? `${warnings.length} scan warning${warnings.length === 1 ? "" : "s"} recorded` : null,
        backendValidation?.provided
          ? `Backend validation matched ${backendValidation.matchedEndpoints.length} endpoint${
              backendValidation.matchedEndpoints.length === 1 ? "" : "s"
            }`
          : "Backend validation was not provided for this run",
        failureClusters.length > 0
          ? `${failureClusters.length} recurring failure cluster${failureClusters.length === 1 ? "" : "s"} detected`
          : "No recurring failure clusters were detected",
      ].filter(Boolean)
    : [];

  const nextSteps = result
    ? [
        failed > 0 ? `Open Tests to review ${failed} failed interaction check${failed === 1 ? "" : "s"}` : null,
        topRoutes[0] ? `Open Pages and inspect ${topRoutes[0].route} first` : null,
        topFindings[0] ? `Open Findings to review ${topFindings[0].severity} severity issues with evidence` : null,
      ].filter(Boolean)
    : [];

  return (
    <section className="grid gap-4">
      {result ? (
        <div className="grid gap-4 fade-in-up">
          <article className="executive-summary-card enterprise-card rounded-[24px] px-6 py-6">
            <p className="enterprise-label text-cyan-700">Executive summary</p>
            <h2 className="mt-3 max-w-5xl break-words text-[2rem] font-bold leading-tight text-slate-900">{toHeadline(result)}</h2>
            <p className="enterprise-body mt-3 max-w-4xl">
              Coverage is {coverage} with {tested} of {totalButtons} target buttons exercised. {issueCases} generated test
              case{issueCases === 1 ? "" : "s"} are currently marked as failed.
            </p>
          </article>

          <div className="grid gap-4 lg:grid-cols-4">
            <article className={insightClassName}>
              <p className="enterprise-label">Coverage</p>
              <p className="mt-3 text-[2.25rem] font-bold leading-none text-slate-900">{coverage}</p>
              <p className="mt-3 text-sm text-slate-500">
                {tested}/{totalButtons} buttons tested
              </p>
            </article>
            <article className={insightClassName}>
              <p className="enterprise-label">Scan scope</p>
              <p className="mt-3 text-[2.25rem] font-bold leading-none text-slate-900">{pages.length}</p>
              <p className="mt-3 text-sm text-slate-500">
                pages and {interactions.length} interactions observed
              </p>
            </article>
            <article className={insightClassName}>
              <p className="enterprise-label">Risk clusters</p>
              <p className="mt-3 text-[2.25rem] font-bold leading-none text-slate-900">{failureClusters.length}</p>
              <p className="mt-3 text-sm text-slate-500">
                {failed} failed checks and {warnings.length} warnings
              </p>
            </article>
            <article className={insightClassName}>
              <p className="enterprise-label">Backend context</p>
              <p className="mt-3 text-[2.25rem] font-bold leading-none text-slate-900">
                {backendValidation?.provided ? "Linked" : "None"}
              </p>
              <p className="mt-3 text-sm text-slate-500">
                {backendValidation?.provided
                  ? `${backendValidation.matchedEndpoints.length} matched endpoint${
                      backendValidation.matchedEndpoints.length === 1 ? "" : "s"
                    }`
                  : "No backend validation input"}
              </p>
            </article>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <article className="insight-panel enterprise-card rounded-[20px] px-5 py-5">
              <p className="enterprise-label">Severity breakdown</p>
              <div className="mt-3 grid gap-2">
                {severityCounts.map((item) => (
                  <div
                    key={item.severity}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <span className="text-sm font-medium capitalize text-slate-900">{item.severity}</span>
                    <span className="text-sm text-slate-500">{item.count} finding{item.count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="insight-panel enterprise-card rounded-[20px] px-5 py-5">
              <p className="enterprise-label">Most affected routes</p>
              <div className="mt-3 grid gap-2">
                {topRoutes.length > 0 ? (
                  topRoutes.map((item) => (
                    <div
                      key={item.route}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <span className="min-w-0 break-all pr-3 text-sm font-medium text-slate-900">{item.route}</span>
                      <span className="text-sm text-slate-500">{item.count} issue{item.count === 1 ? "" : "s"}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    No route-level finding concentration detected in this run.
                  </div>
                )}
              </div>
            </article>

            <article className="insight-panel enterprise-card rounded-[20px] px-5 py-5">
              <p className="enterprise-label">Next steps</p>
              <div className="mt-3 grid gap-2">
                {nextSteps.length > 0 ? (
                  nextSteps.map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    No immediate action is suggested from the current run.
                  </div>
                )}
              </div>
            </article>
          </div>

          <article className="rounded-[1.35rem] border border-emerald-300/12 bg-[linear-gradient(180deg,rgba(6,78,59,0.28)_0%,rgba(15,23,42,0.82)_100%)] px-4 py-3.5">
            <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">Scan notes</p>
            <div className="mt-2.5 grid gap-2">
              {scanNotes.map((item) => (
                <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-300 break-words">
                  {item}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[1.35rem] border border-rose-300/12 bg-[linear-gradient(180deg,rgba(63,28,45,0.5)_0%,rgba(15,23,42,0.82)_100%)] px-4 py-3.5">
            <p className="text-xs uppercase tracking-[0.22em] text-rose-200">Top findings</p>
            <div className="mt-2.5 grid gap-2">
              {topFindings.length > 0 ? (
                topFindings.map((item) => (
                  <div key={item.findingId} className="rounded-[1rem] border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-300">
                    <p className="break-words font-medium text-white">{item.summary}</p>
                    <p className="mt-1 text-xs uppercase text-rose-200">{item.severity} • {item.type}</p>
                    <p className="mt-2 break-all text-xs text-slate-400">{item.pageUrl}</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/60 px-3.5 py-3 text-sm text-slate-400">
                  No warnings in the latest run.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-[1.35rem] border border-amber-300/12 bg-[linear-gradient(180deg,rgba(120,53,15,0.36)_0%,rgba(15,23,42,0.82)_100%)] px-4 py-3.5">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-200">Suggestions</p>
            <div className="mt-2.5 grid gap-2">
              {topSuggestions.length > 0 ? (
                topSuggestions.map((item) => (
                  <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-300 break-words">
                    {item}
                  </div>
                ))
              ) : (
                <EmptyStatePanel
                  title="No suggestions"
                  actionLabel="Next step"
                  tone="pass"
                />
              )}
            </div>
          </article>
        </div>
      ) : (
        <EmptyStatePanel
          title="No insights yet"
          actionLabel="Next step"
          tone="active"
        />
      )}
    </section>
  );
}
