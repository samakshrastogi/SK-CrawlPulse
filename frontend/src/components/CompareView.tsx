import { useMemo, useState } from "react";
import { runtime } from "../config/runtime";
import { EmptyStatePanel } from "./EmptyStatePanel";
import { userScopedResourceUrl } from "../utils/userScopedUrl";
import type { AnalysisRun } from "../types/analysis";

type CompareViewProps = {
  availableRuns: AnalysisRun[];
  runs: AnalysisRun[];
  onCompareRuns: (runIds: string[]) => Promise<void>;
  userEmail: string;
};

type DiffTab = "new" | "fixed" | "persistent";

export function CompareView({ availableRuns, runs, onCompareRuns, userEmail }: CompareViewProps) {
  const [tab, setTab] = useState<DiffTab>("new");
  const [baselineId, setBaselineId] = useState(runs[0]?.runId ?? "");
  const [comparisonId, setComparisonId] = useState(runs[1]?.runId ?? "");

  const completedRuns = useMemo(
    () =>
      availableRuns
        .filter((run) => run.status === "completed")
        .sort((left, right) => new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime()),
    [availableRuns],
  );

  const baselineOptions = completedRuns;
  const baselineDomain =
    baselineOptions.find((run) => run.runId === baselineId)?.request.targetUrl
      ? toDomain(baselineOptions.find((run) => run.runId === baselineId)?.request.targetUrl ?? "")
      : "";
  const comparisonOptions = baselineDomain
    ? completedRuns.filter((run) => toDomain(run.request.targetUrl) === baselineDomain && run.runId !== baselineId)
    : [];
  const compareDisabled = !baselineId || !comparisonId;

  const [left, right] = runs;

  const leftResult = left?.result;
  const rightResult = right?.result;

  const leftFindings = useMemo(
    () => leftResult?.frontend.runtimeFindings ?? [],
    [leftResult?.frontend.runtimeFindings],
  );
  const rightFindings = useMemo(
    () => rightResult?.frontend.runtimeFindings ?? [],
    [rightResult?.frontend.runtimeFindings],
  );

  const newFindings = useMemo(
    () =>
      rightFindings.filter(
        (finding) =>
          !leftFindings.some((baseline) => baseline.summary === finding.summary && baseline.pageUrl === finding.pageUrl),
      ),
    [leftFindings, rightFindings],
  );

  const fixedFindings = useMemo(
    () =>
      leftFindings.filter(
        (finding) =>
          !rightFindings.some((comparison) => comparison.summary === finding.summary && comparison.pageUrl === finding.pageUrl),
      ),
    [leftFindings, rightFindings],
  );

  const persistentFindings = useMemo(
    () =>
      rightFindings.filter((finding) =>
        leftFindings.some((baseline) => baseline.summary === finding.summary && baseline.pageUrl === finding.pageUrl),
      ),
    [leftFindings, rightFindings],
  );

  const visibleFindings = tab === "new" ? newFindings : tab === "fixed" ? fixedFindings : persistentFindings;

  return (
    <section className="grid gap-5">
      <article className="rounded-[1.8rem] border border-white/10 bg-slate-950/82 p-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Compare runs</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_180px]">
          <label className="grid gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Baseline run</span>
            <select
              value={baselineId}
              onChange={(event) => {
                const nextBaselineId = event.target.value;
                setBaselineId(nextBaselineId);

                const nextDomain = toDomain(
                  completedRuns.find((run) => run.runId === nextBaselineId)?.request.targetUrl ?? "",
                );
                const nextComparison = completedRuns.find(
                  (run) => toDomain(run.request.targetUrl) === nextDomain && run.runId !== nextBaselineId,
                );
                setComparisonId((current) =>
                  current && current !== nextBaselineId && toDomain(completedRuns.find((run) => run.runId === current)?.request.targetUrl ?? "") === nextDomain
                    ? current
                    : (nextComparison?.runId ?? ""),
                );
              }}
              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="">Select baseline run</option>
              {baselineOptions.map((run) => (
                <option key={run.runId} value={run.runId}>
                  {formatRunOption(run)}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Comparison run</span>
            <select
              value={comparisonId}
              onChange={(event) => setComparisonId(event.target.value)}
              disabled={!baselineDomain}
              className="rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">{baselineDomain ? "Select comparison run" : "Pick a baseline first"}</option>
              {comparisonOptions.map((run) => (
                <option key={run.runId} value={run.runId}>
                  {formatRunOption(run)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            disabled={compareDisabled}
            onClick={() => void onCompareRuns([baselineId, comparisonId])}
            className="mt-[1.45rem] h-[50px] rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 disabled:cursor-not-allowed disabled:opacity-35"
          >
            Load compare
          </button>
        </div>

      </article>

      {runs.length < 2 ? (
        <EmptyStatePanel
          title="No comparison loaded"
          actionLabel="Next step"
          tone="active"
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {[left, right].map((run, index) => (
              <RunVisualCard key={run.runId} run={run} label={index === 0 ? "Baseline" : "Comparison"} userEmail={userEmail} />
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="compare-panel-shell rounded-[1.8rem] border border-white/10 bg-slate-900/72 p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Coverage delta</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <CompareMetric
                  label="Pages"
                  value={signed((rightResult?.frontend.pages.length ?? 0) - (leftResult?.frontend.pages.length ?? 0))}
                />
                <CompareMetric
                  label="Interactions"
                  value={signed((rightResult?.frontend.interactionResults.length ?? 0) - (leftResult?.frontend.interactionResults.length ?? 0))}
                />
                <CompareMetric
                  label="Failures"
                  value={signed((rightResult?.frontend.coverageReport.failed ?? 0) - (leftResult?.frontend.coverageReport.failed ?? 0))}
                />
              </div>
            </article>

            <article className="compare-panel-shell rounded-[1.8rem] border border-white/10 bg-slate-900/72 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Finding diff</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["new", newFindings.length],
                    ["fixed", fixedFindings.length],
                    ["persistent", persistentFindings.length],
                  ].map(([key, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key as DiffTab)}
                      className={`rounded-full border px-3 py-2 text-xs tab-motion ${
                        tab === key ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"
                      }`}
                    >
                      {key} ({count})
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {visibleFindings.length > 0 ? (
                  visibleFindings.slice(0, 10).map((finding) => (
                    <div
                      key={`${finding.pageUrl}-${finding.summary}`}
                      className={`rounded-[1.3rem] border p-4 ${shellForTab(tab)}`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-white">{finding.summary}</p>
                        <span className={`rounded-full border px-3 py-1 text-[11px] ${severityTone(finding.severity)}`}>
                          {finding.severity}
                        </span>
                      </div>
                      <p className="mt-2 truncate text-xs text-slate-400">{finding.pageUrl}</p>
                      <p className="mt-2 text-sm text-slate-200">{finding.details}</p>
                    </div>
                  ))
                ) : (
                  <EmptyStatePanel
                    title="No findings in this diff tab"
                    actionLabel="Try"
                    tone="pass"
                  />
                )}
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}

function RunVisualCard({ run, label, userEmail }: { run: AnalysisRun; label: string; userEmail: string }) {
  const snapshot = getRunSnapshot(run, userEmail);

  return (
    <article className="compare-run-shell overflow-hidden rounded-[1.8rem] border border-white/10 bg-slate-950/82">
      <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="border-b border-white/10 bg-slate-950/60 lg:border-b-0 lg:border-r">
          {snapshot ? (
            <img src={snapshot} alt={run.request.targetUrl} className="h-full min-h-[180px] w-full object-cover" />
          ) : (
            <div className="flex h-full min-h-[180px] items-center justify-center text-xs text-slate-500">
              No snapshot
            </div>
          )}
        </div>

        <div className="p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{label}</p>
          <h2 className="mt-3 text-lg font-semibold text-white">{run.request.targetUrl}</h2>
          <p className="mt-2 text-xs text-slate-400">{run.runId}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <CompareMetric label="Coverage" value={run.result?.frontend.coverageReport.coverage ?? "--"} />
            <CompareMetric label="Pages" value={String(run.result?.frontend.pages.length ?? run.pages.length)} />
            <CompareMetric label="Fails" value={String(run.result?.frontend.coverageReport.failed ?? 0)} />
            <CompareMetric label="Elapsed" value={`${run.elapsedSeconds}s`} />
          </div>
        </div>
      </div>
    </article>
  );
}

function CompareMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function getRunSnapshot(run: AnalysisRun, userEmail: string) {
  const snapshotUrl =
    run.result?.frontend.pages.find((page) => page.previewImageUrl)?.previewImageUrl ??
    run.pages.find((page) => page.previewImageUrl)?.previewImageUrl ??
    run.artifacts?.find((artifact) => artifact.kind.includes("preview"))?.publicUrl;

  return userScopedResourceUrl(runtime.apiBaseUrl, snapshotUrl, userEmail);
}

function severityTone(severity: "low" | "medium" | "high") {
  return severity === "high"
    ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
    : severity === "medium"
      ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
      : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200";
}

function shellForTab(tab: DiffTab) {
  return tab === "fixed"
    ? "border-emerald-300/18 bg-[linear-gradient(135deg,rgba(6,78,59,0.38)_0%,rgba(15,23,42,0.82)_100%)]"
    : tab === "persistent"
      ? "border-amber-300/18 bg-[linear-gradient(135deg,rgba(120,53,15,0.38)_0%,rgba(15,23,42,0.82)_100%)]"
      : "border-rose-300/18 bg-[linear-gradient(135deg,rgba(63,28,45,0.48)_0%,rgba(15,23,42,0.82)_100%)]";
}

function signed(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function toDomain(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

function formatRunOption(run: AnalysisRun) {
  return `${toDomain(run.request.targetUrl)} • ${new Date(run.startedAt).toLocaleString()} • ${run.runId.slice(0, 8)}`;
}
