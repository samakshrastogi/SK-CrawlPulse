import { useMemo, useState } from "react";
import { runtime } from "../config/runtime";
import { userScopedResourceUrl } from "../utils/userScopedUrl";
import type { AnalysisRun, GlobalFilters } from "../types/analysis";

type HistoryViewProps = {
  runs: AnalysisRun[];
  filters: GlobalFilters;
  onSelectRun: (run: AnalysisRun) => void;
  userEmail: string;
};

export function HistoryView({ runs, filters, onSelectRun, userEmail }: HistoryViewProps) {
  const [query, setQuery] = useState("");
  const websiteOptions = useMemo(() => Array.from(new Set(runs.map((run) => toDomain(run.request.targetUrl)))), [runs]);

  const runsByDomain = useMemo(() => {
    const map = new Map<string, AnalysisRun[]>();
    runs.forEach((run) => {
      const domain = toDomain(run.request.targetUrl);
      const bucket = map.get(domain) ?? [];
      bucket.push(run);
      map.set(domain, bucket);
    });

    map.forEach((bucket, domain) => {
      map.set(
        domain,
        [...bucket].sort((left, right) => new Date(left.startedAt).getTime() - new Date(right.startedAt).getTime()),
      );
    });

    return map;
  }, [runs]);

  const filteredRuns = useMemo(
    () =>
      runs.filter((run) => {
        const matchesStatus = filters.status === "all" || run.status === filters.status;
        const matchesDomain = filters.website === "all" || toDomain(run.request.targetUrl) === filters.website;
        const matchesRoute =
          filters.route === "all" ||
          run.pages.some((page) => page.routePath === filters.route) ||
          run.result?.frontend.pages.some((page) => page.routePath === filters.route);
        const matchesQuery = `${run.request.targetUrl} ${run.runId}`.toLowerCase().includes(query.toLowerCase());
        return matchesStatus && matchesDomain && matchesRoute && matchesQuery;
      }),
    [filters.route, filters.status, filters.website, query, runs],
  );

  return (
    <section className="grid gap-5">
      <article className="rounded-[1.8rem] border border-white/10 bg-slate-950/82 p-5">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Run history</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(240px,1.25fr)_minmax(140px,0.7fr)_minmax(140px,0.7fr)]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search runs"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
            />
            <div className="flex items-center rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
              {filters.status === "all" ? "All status" : filters.status}
            </div>
            <div className="flex items-center rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-400">
              {filters.website === "all" ? "All websites" : filters.website}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <HistoryMetric label="Visible runs" value={String(filteredRuns.length)} />
          <HistoryMetric label="Status filter" value={filters.status === "all" ? "All status" : filters.status} />
          <HistoryMetric label="Domains" value={String(websiteOptions.length)} />
        </div>
      </article>

      <div className="grid gap-4">
        {filteredRuns.length > 0 ? (
          filteredRuns.map((run) => {
            const domain = toDomain(run.request.targetUrl);
            const domainRuns = runsByDomain.get(domain) ?? [run];
            const domainIndex = domainRuns.findIndex((item) => item.runId === run.runId);
            const previousRun = domainIndex > 0 ? domainRuns[domainIndex - 1] : null;
            const snapshot = getRunSnapshot(run, userEmail);
            const pageCount = run.result?.frontend.pages.length ?? run.progress.pagesDiscovered ?? 0;
            const findings = run.result?.frontend.runtimeFindings ?? [];
            const severityCounts = countFindingsBySeverity(findings);
            const coverageReport = run.result?.frontend.coverageReport;
            const outcome = buildOutcomeSummary(run, pageCount);
            const delta = buildDeltaSummary(run, previousRun);
            const blocker = buildBlockerSummary(run);
            const routePreview = buildRoutePreview(run);

            return (
              <button
                key={run.runId}
                type="button"
                onClick={() => onSelectRun(run)}
                className="history-run-card grid gap-4 rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(7,12,27,0.96))] p-4 text-left transition duration-200 hover:border-cyan-300/25 hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(7,12,27,1))] sm:p-4.5"
              >
                <div className="grid gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <img
                        src={faviconForDomain(domain)}
                        alt={domain}
                        className="h-12 w-12 rounded-2xl border border-white/10 bg-slate-950/70 p-2 object-contain shadow-[0_0_0_1px_rgba(255,255,255,0.03)]"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-all text-base font-semibold text-white">{run.request.targetUrl}</p>
                          <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-cyan-200">
                            {run.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">
                          Started {new Date(run.startedAt).toLocaleString()} • {formatRelativeTime(run.completedAt ?? run.updatedAt)}
                        </p>
                        <p className="mt-2 text-sm text-slate-200">{outcome}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Outcome summary</p>
                    <p className="mt-1.5 text-sm font-medium text-white">{outcome}</p>
                    <p className="mt-1.5 text-xs text-slate-400">{delta}</p>
                  </div>

                  <div className="grid gap-2 md:grid-cols-4">
                    <RunChip label="Pages" value={String(pageCount)} />
                    <TrendCard
                      label="Failures"
                      values={domainRuns.map((item) => item.result?.frontend.coverageReport.failed ?? 0)}
                      accent="rose"
                    />
                    <TrendCard
                      label="Coverage"
                      values={domainRuns.map(
                        (item) => Number.parseInt(item.result?.frontend.coverageReport.coverage ?? "0", 10) || 0,
                      )}
                      accent="cyan"
                      suffix="%"
                    />
                    <TrendCard
                      label="Elapsed"
                      values={domainRuns.map((item) => item.elapsedSeconds)}
                      accent="amber"
                      suffix="s"
                    />
                  </div>

                  <div className="grid gap-2 md:grid-cols-3">
                    <RunChip
                      label="Coverage breakdown"
                      value={
                        coverageReport
                          ? `${coverageReport.tested}/${coverageReport.total_buttons} tested`
                          : "No coverage report"
                      }
                      tone={coverageReport && coverageReport.failed > 0 ? "warn" : "active"}
                    />
                    <RunChip
                      label="Failures / Passed"
                      value={
                        coverageReport
                          ? `${coverageReport.failed} fail • ${coverageReport.passed} pass`
                          : "No interaction data"
                      }
                      tone={coverageReport && coverageReport.failed > 0 ? "fail" : "active"}
                    />
                    <RunChip
                      label="Findings"
                      value={`H ${severityCounts.high} • M ${severityCounts.medium} • L ${severityCounts.low}`}
                      tone={severityCounts.high > 0 ? "fail" : severityCounts.medium > 0 ? "warn" : "active"}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <InsightPanel
                      title="Run state"
                      value={run.progress.summary}
                      detail={run.progress.currentPageUrl ? `Current page: ${run.progress.currentPageUrl}` : "No active page trace."}
                    />
                    <InsightPanel
                      title="Live note"
                      value={run.progress.lastSuccessfulAction?.label ?? "No recent action"}
                      detail={
                        run.progress.lastSuccessfulAction?.pageUrl
                          ? `Last success on ${run.progress.lastSuccessfulAction.pageUrl}`
                          : "Waiting for interaction evidence."
                      }
                    />
                    <InsightPanel
                      title={blocker.title}
                      value={blocker.value}
                      detail={blocker.detail}
                    />
                    <InsightPanel
                      title="Timeline"
                      value={run.completedAt ? `Completed ${new Date(run.completedAt).toLocaleString()}` : "Still active"}
                      detail={`Elapsed ${run.elapsedSeconds}s${run.expectedDurationSeconds ? ` of ~${run.expectedDurationSeconds}s expected` : ""}`}
                    />
                  </div>

                  <div className="grid gap-2 sm:grid-cols-1">
                    <InsightPanel
                      title="Routes covered"
                      value={routePreview.value}
                      detail={routePreview.detail}
                    />
                  </div>

                  <div className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-3">
                    <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">Snapshots</p>

                    {snapshot ? (
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
                        <img
                          src={snapshot}
                          alt={domain}
                          className="h-[140px] w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-[96px] items-center justify-center rounded-xl border border-dashed border-white/10 bg-slate-950/45 text-xs text-slate-500">
                        No snapshot available
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="rounded-[1.6rem] border border-white/10 bg-slate-900/72 px-5 py-10 text-sm text-slate-400">
            No history matches the current filters.
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1.5 break-words text-xs text-white">{value}</p>
    </div>
  );
}

function RunChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "active" | "warn" | "fail";
}) {
  const toneClass =
    tone === "fail"
      ? "border-rose-300/20 bg-rose-400/10 text-rose-100"
      : tone === "warn"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-100"
        : tone === "active"
          ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100"
          : "border-white/10 bg-slate-950/55 text-white";

  return (
    <div className={`rounded-xl border px-3 py-2.5 ${toneClass}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}

function TrendCard({
  label,
  values,
  accent,
  suffix,
}: {
  label: string;
  values: number[];
  accent: "rose" | "cyan" | "amber";
  suffix?: string;
}) {
  const points = sparklinePoints(values);
  const latest = values.at(-1) ?? 0;
  const accentClass = accent === "rose" ? "text-rose-200" : accent === "amber" ? "text-amber-200" : "text-cyan-200";
  const stroke = accent === "rose" ? "#fda4af" : accent === "amber" ? "#fcd34d" : "#67e8f9";

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
        <span className={`text-sm font-medium ${accentClass}`}>
          {latest}
          {suffix ?? ""}
        </span>
      </div>
      <svg viewBox="0 0 100 32" className="mt-2 h-8 w-full">
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
        />
      </svg>
    </div>
  );
}

function InsightPanel({
  title,
  value,
  detail,
}: {
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/55 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className="mt-1.5 text-xs font-medium text-white">{value}</p>
      <p className="mt-1.5 text-[11px] text-slate-400">{detail}</p>
    </div>
  );
}

function buildOutcomeSummary(run: AnalysisRun, pageCount: number) {
  const failures = run.result?.frontend.coverageReport.failed ?? 0;

  if (run.status === "awaiting_checkpoint") {
    return `Waiting for checkpoint approval after discovering ${pageCount} page${pageCount === 1 ? "" : "s"}.`;
  }

  if (run.status === "failed") {
    return `Failed after ${run.elapsedSeconds}s${pageCount > 0 ? ` with ${pageCount} page${pageCount === 1 ? "" : "s"} explored` : ""}.`;
  }

  if (run.status === "completed") {
    if (failures > 0) {
      return `Completed with ${failures} failing interaction${failures === 1 ? "" : "s"} across ${pageCount} page${pageCount === 1 ? "" : "s"}.`;
    }

    return `Completed cleanly across ${pageCount} page${pageCount === 1 ? "" : "s"} with no failing interactions.`;
  }

  if (run.status === "running") {
    return `Running for ${run.elapsedSeconds}s${pageCount > 0 ? ` with ${pageCount} page${pageCount === 1 ? "" : "s"} discovered so far` : ""}.`;
  }

  return "Queued and waiting to start analysis.";
}

function buildDeltaSummary(run: AnalysisRun, previousRun: AnalysisRun | null) {
  if (!previousRun?.result || !run.result) {
    return previousRun ? "No comparable completed baseline for this run yet." : "First recorded run for this domain.";
  }

  const currentCoverage = Number.parseInt(run.result.frontend.coverageReport.coverage, 10) || 0;
  const previousCoverage = Number.parseInt(previousRun.result.frontend.coverageReport.coverage, 10) || 0;
  const currentFailures = run.result.frontend.coverageReport.failed ?? 0;
  const previousFailures = previousRun.result.frontend.coverageReport.failed ?? 0;
  const currentFindings = run.result.frontend.runtimeFindings.length;
  const previousFindings = previousRun.result.frontend.runtimeFindings.length;

  return [
    `Vs previous run: ${signed(currentFailures - previousFailures)} failures`,
    `${signed(currentCoverage - previousCoverage)}% coverage`,
    `${signed(currentFindings - previousFindings)} findings`,
  ].join(" • ");
}

function buildBlockerSummary(run: AnalysisRun) {
  if (run.status === "awaiting_checkpoint" && run.progress.checkpoint) {
    return {
      title: "Needs input",
      value: run.progress.checkpoint.label,
      detail: run.progress.checkpoint.instructions || "Manual confirmation is required before the run can continue.",
    };
  }

  if (run.status === "failed") {
    return {
      title: "Failure reason",
      value: run.error ?? run.progress.summary,
      detail: run.progress.currentPageUrl
        ? `Stopped on ${run.progress.currentPageUrl}`
        : run.progress.technical || "No page trace was captured before the run stopped.",
    };
  }

  if (run.status === "running") {
    return {
      title: "Current focus",
      value: run.progress.stageLabel,
      detail: run.progress.currentPageUrl
        ? `Testing ${run.progress.currentPageUrl}`
        : run.progress.technical || "The current page has not been pinned yet.",
    };
  }

  return {
    title: "Latest checkpoint",
    value: run.progress.stageLabel,
    detail: run.progress.technical || "No extra technical notes were captured for this run.",
  };
}

function buildRoutePreview(run: AnalysisRun) {
  const previewPages = run.progress.pagesPreview ?? [];
  const resultPages = run.result?.frontend.pages ?? run.pages;
  const routeCandidates = [
    ...previewPages.map((page) => page.routePath).filter(Boolean),
    ...resultPages.map((page) => page.routePath).filter(Boolean),
  ];
  const uniqueRoutes = Array.from(new Set(routeCandidates));
  const sample = uniqueRoutes.slice(0, 3);

  if (sample.length === 0) {
    return {
      value: "No route details",
      detail: "This run did not capture route-level coverage previews.",
    };
  }

  return {
    value: sample.join(" • "),
    detail:
      uniqueRoutes.length > sample.length
        ? `${uniqueRoutes.length} total routes captured in this run.`
        : `${uniqueRoutes.length} route${uniqueRoutes.length === 1 ? "" : "s"} captured in this run.`,
  };
}

function countFindingsBySeverity(findings: Array<{ severity: "low" | "medium" | "high" }>) {
  return findings.reduce(
    (counts, finding) => {
      counts[finding.severity] += 1;
      return counts;
    },
    { high: 0, medium: 0, low: 0 },
  );
}

function sparklinePoints(values: number[]) {
  const sample = values.slice(-6);
  const max = Math.max(...sample, 1);
  const min = Math.min(...sample, 0);
  const spread = Math.max(max - min, 1);

  return sample
    .map((value, index) => {
      const x = sample.length === 1 ? 50 : (index / (sample.length - 1)) * 100;
      const y = 28 - ((value - min) / spread) * 24;
      return `${x},${y}`;
    })
    .join(" ");
}

function faviconForDomain(domain: string) {
  return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}`;
}

function getRunSnapshot(run: AnalysisRun, userEmail: string) {
  const snapshotUrl =
    run.result?.frontend.pages.find((page) => page.previewImageUrl)?.previewImageUrl ??
    run.pages.find((page) => page.previewImageUrl)?.previewImageUrl ??
    run.artifacts?.find((artifact) => artifact.kind.includes("preview"))?.publicUrl;

  return userScopedResourceUrl(runtime.apiBaseUrl, snapshotUrl, userEmail);
}

function toDomain(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function formatRelativeTime(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const seconds = Math.max(Math.round(deltaMs / 1000), 0);

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
