import type { AnalysisResponse } from "../types/analysis";

import { EmptyStatePanel } from "./EmptyStatePanel";

type OverviewViewProps = {
  result: AnalysisResponse | null;
};

const insightClassName = "app-card fade-in-up px-4 py-3";

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
    <section className="grid gap-3">
      {result ? (
        <div className="grid gap-3 fade-in-up">
          <article className="rounded-[1.35rem] border border-cyan-300/12 bg-[linear-gradient(180deg,rgba(8,47,73,0.42)_0%,rgba(15,23,42,0.88)_100%)] px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Executive summary</p>
            <h2 className="mt-2 break-words text-xl font-semibold text-white">{toHeadline(result)}</h2>
            <p className="mt-2 max-w-4xl text-sm text-slate-300">
              Coverage is {coverage} with {tested} of {totalButtons} target buttons exercised. {issueCases} generated test
              case{issueCases === 1 ? "" : "s"} are currently marked as failed.
            </p>
          </article>

          <div className="grid gap-3 lg:grid-cols-4">
            <article className={insightClassName}>
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Coverage</p>
              <p className="mt-1 text-[1.75rem] font-semibold leading-none text-white">{coverage}</p>
              <p className="mt-2 text-xs text-slate-400">
                {tested}/{totalButtons} buttons tested
              </p>
            </article>
            <article className={insightClassName}>
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Scan scope</p>
              <p className="mt-1 text-[1.75rem] font-semibold leading-none text-white">{pages.length}</p>
              <p className="mt-2 text-xs text-slate-400">
                pages and {interactions.length} interactions observed
              </p>
            </article>
            <article className={insightClassName}>
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Risk clusters</p>
              <p className="mt-1 text-[1.75rem] font-semibold leading-none text-white">{failureClusters.length}</p>
              <p className="mt-2 text-xs text-slate-400">
                {failed} failed checks and {warnings.length} warnings
              </p>
            </article>
            <article className={insightClassName}>
              <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Backend context</p>
              <p className="mt-1 text-[1.75rem] font-semibold leading-none text-white">
                {backendValidation?.provided ? "Linked" : "None"}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {backendValidation?.provided
                  ? `${backendValidation.matchedEndpoints.length} matched endpoint${
                      backendValidation.matchedEndpoints.length === 1 ? "" : "s"
                    }`
                  : "No backend validation input"}
              </p>
            </article>
          </div>

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <article className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 px-4 py-3.5">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Severity breakdown</p>
              <div className="mt-3 grid gap-2">
                {severityCounts.map((item) => (
                  <div
                    key={item.severity}
                    className="flex items-center justify-between rounded-[1rem] border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
                  >
                    <span className="text-sm font-medium capitalize text-white">{item.severity}</span>
                    <span className="text-sm text-slate-300">{item.count} finding{item.count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 px-4 py-3.5">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Most affected routes</p>
              <div className="mt-3 grid gap-2">
                {topRoutes.length > 0 ? (
                  topRoutes.map((item) => (
                    <div
                      key={item.route}
                      className="flex items-center justify-between rounded-[1rem] border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
                    >
                      <span className="min-w-0 break-all pr-3 text-sm font-medium text-white">{item.route}</span>
                      <span className="text-sm text-slate-300">{item.count} issue{item.count === 1 ? "" : "s"}</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-slate-400">
                    No route-level finding concentration detected in this run.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[1.35rem] border border-white/10 bg-slate-950/60 px-4 py-3.5">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">Next steps</p>
              <div className="mt-3 grid gap-2">
                {nextSteps.length > 0 ? (
                  nextSteps.map((item) => (
                    <div
                      key={item}
                      className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-slate-300"
                    >
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-slate-400">
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
                  description="No improvement suggestions were generated for this run's top insight slice."
                  actionLabel="Next step"
                  actionHint="Open Tests for detailed case suggestions."
                  tone="pass"
                />
              )}
            </div>
          </article>
        </div>
      ) : (
        <EmptyStatePanel
          title="No insights yet"
          description="This workspace fills with coverage, findings, and suggestions after the first analysis run."
          actionLabel="Next step"
          actionHint="Open Run and start a target scan."
          tone="active"
        />
      )}
    </section>
  );
}
