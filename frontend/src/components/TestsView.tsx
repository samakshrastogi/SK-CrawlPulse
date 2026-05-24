import { useEffect, useMemo, useState } from "react";
import { runtime } from "../config/runtime";
import { EmptyStatePanel } from "./EmptyStatePanel";
import type { AnalysisResponse, GlobalFilters } from "../types/analysis";

type TestsViewProps = {
  result: AnalysisResponse | null;
  filters: GlobalFilters;
};

export function TestsView({ result, filters }: TestsViewProps) {
  const apiBaseUrl = runtime.apiBaseUrl;
  const allTests = result?.testCases ?? [];
  const [testIndex, setTestIndex] = useState(0);

  const tests = useMemo(
    () =>
      allTests.filter((item) => {
        const statusOk = filters.status === "all" || (item.status ?? "PASS") === filters.status;
        const routeOk = filters.route === "all" || toRoute(item.sourcePage) === filters.route;
        const typeOk = filters.issueType === "all" || item.category === filters.issueType;
        return statusOk && routeOk && typeOk;
      }),
    [allTests, filters.issueType, filters.route, filters.status],
  );

  const failedTests = tests.filter((item) => item.status === "FAIL");
  const visibleTests = failedTests.length > 0 ? failedTests : tests;

  useEffect(() => {
    setTestIndex(0);
  }, [result?.runId, filters.status, filters.route, filters.issueType]);

  const summary = useMemo(() => {
    const filteredFailed = tests.filter((item) => item.status === "FAIL").length;
    const filteredPassed = tests.length - filteredFailed;
    const criticalCount = tests.filter((item) => item.priority === "P0").length;
    const routes = new Set(tests.map((item) => toRoute(item.sourcePage)));
    const categories = new Set(tests.map((item) => item.category));
    const sourceKinds = new Set(tests.map((item) => item.sourceKind ?? "analysis-generated"));
    const interactionsTested = result?.frontend.interactionResults.length ?? 0;
    const interactionsDetected =
      result?.frontend.pages.reduce((count, page) => count + page.buttons.length + page.links.length + page.forms.length, 0) ?? 0;

    return {
      total: tests.length,
      failed: filteredFailed,
      passed: filteredPassed,
      critical: criticalCount,
      routes: routes.size,
      categories: categories.size,
      sourceKinds: sourceKinds.size,
      interactionsTested,
      interactionsDetected,
    };
  }, [result, tests]);

  const groupedTests = useMemo(() => {
    const indexed = visibleTests.map((item, index) => ({ item, index }));

    return [
      {
        key: "critical",
        label: "Critical failures",
        hint: "P0 failures that can block a core flow or show repeated breakage.",
        items: indexed.filter(({ item }) => item.status === "FAIL" && item.priority === "P0"),
      },
      {
        key: "failures",
        label: "Other failures",
        hint: "Confirmed issues that still need triage, but are less severe than the critical slice.",
        items: indexed.filter(({ item }) => item.status === "FAIL" && item.priority !== "P0"),
      },
      {
        key: "passed",
        label: "Passed coverage",
        hint: "Checks that passed during this run and help explain the covered surface area.",
        items: indexed.filter(({ item }) => (item.status ?? "PASS") !== "FAIL"),
      },
    ].filter((section) => section.items.length > 0);
  }, [visibleTests]);

  if (visibleTests.length === 0) {
    return (
      <EmptyStatePanel
        title="No test cases in view"
        description="Either the run has not produced cases yet or the current route, status, or type filters narrowed the list to zero."
        actionLabel="Try"
        actionHint="Broaden filters or include passed cases."
        tone="warn"
      />
    );
  }

  const activeTest = visibleTests[Math.min(testIndex, visibleTests.length - 1)];
  const focusMessage = buildFocusMessage(summary);
  const evidenceItems = Array.from(
    new Set(
      [activeTest.issueSummary, ...(activeTest.evidenceItems ?? [])].filter(
        (value): value is string => Boolean(value?.trim()),
      ),
    ),
  );

  return (
    <section className="grid gap-5">
      <article className="rounded-[1.8rem] border border-white/10 bg-slate-950/82 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Tests overview</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">What this run covered and where it broke</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              These cases combine repeated interaction failures, runtime findings, targeted scenarios, and baseline page smoke checks.
              The page focuses on what failed first, how much of the product was covered, and why the selected case matters.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300/18 bg-amber-400/8 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-amber-200">Current slice</p>
            <p className="mt-2 text-sm text-slate-200">
              {filters.route === "all" ? "All routes" : filters.route} • {filters.status === "all" ? "All status" : filters.status}
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Showing {visibleTests.length} visible case{visibleTests.length === 1 ? "" : "s"} from {summary.total} filtered result
              {summary.total === 1 ? "" : "s"}.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <MetricCard label="Filtered cases" value={String(summary.total)} helper="Cases matching the current filters." />
          <MetricCard label="Failed" value={String(summary.failed)} helper="Cases with confirmed failure evidence." tone="fail" />
          <MetricCard label="Critical" value={String(summary.critical)} helper="P0 items that need first attention." tone="warn" />
          <MetricCard label="Routes" value={String(summary.routes)} helper="Distinct routes represented here." />
          <MetricCard label="Case sources" value={String(summary.sourceKinds)} helper="How many analysis sources contributed to this slice." />
          <MetricCard
            label="Interactions tested"
            value={
              summary.interactionsDetected > 0
                ? `${summary.interactionsTested}/${summary.interactionsDetected}`
                : String(summary.interactionsTested)
            }
            helper={
              summary.interactionsDetected > 0
                ? "Executed checks compared with the interaction opportunities discovered during the crawl."
                : "Observed interactions were not counted for this run."
            }
          />
        </div>

        <div className="mt-5 rounded-2xl border border-cyan-300/14 bg-cyan-400/8 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-200">Focus</p>
          <p className="mt-2 text-sm leading-7 text-slate-100">{focusMessage}</p>
        </div>
      </article>

      <section className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]">
        <article className="min-w-0 rounded-[1.8rem] border border-white/10 bg-slate-950/82 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Grouped cases</p>
            <p className="mt-2 text-sm text-slate-400">Critical failures are pinned first, then the remaining failures. Passed coverage appears only when no failures exist in the current slice.</p>
          </div>

          <div className="mt-5 grid gap-4">
            {groupedTests.map((section) => (
              <div key={section.key} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{section.label}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-500">{section.hint}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[11px] text-slate-200">
                    {section.items.length}
                  </span>
                </div>
                <div className="mt-3 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
                  {section.items.map(({ item, index }) => (
                    <button
                      key={item.testId}
                      type="button"
                      onClick={() => setTestIndex(index)}
                      className={`rounded-2xl border px-4 py-4 text-left tab-motion ${
                        item.testId === activeTest.testId
                          ? item.status === "FAIL"
                            ? "border-rose-300/25 bg-rose-400/10 live-update"
                            : "border-cyan-300/25 bg-cyan-400/10 live-update"
                          : item.status === "FAIL"
                            ? "border-rose-300/15 bg-[linear-gradient(135deg,rgba(63,28,45,0.42)_0%,rgba(15,23,42,0.76)_100%)]"
                            : "border-white/10 bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-medium text-white">{item.title}</p>
                        <span className={`rounded-full border px-3 py-1 text-[11px] ${statusTone(item.status ?? "PASS")}`}>
                          {item.status ?? "PASS"}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        <span>{item.priority}</span>
                        <span>{item.category}</span>
                        <span>{item.affectedFlow ?? toRoute(item.sourcePage)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article
          className={`grid gap-4 rounded-[1.8rem] border p-6 ${
            activeTest.status === "FAIL"
              ? "border-rose-300/18 bg-[linear-gradient(135deg,rgba(63,28,45,0.48)_0%,rgba(15,23,42,0.84)_100%)]"
              : "border-cyan-300/14 bg-[linear-gradient(135deg,rgba(8,47,73,0.34)_0%,rgba(15,23,42,0.84)_100%)]"
          }`}
        >
          <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Case</p>
            <h3 className="mt-3 break-words text-xl font-semibold text-white">{activeTest.title}</h3>
            <p className="mt-2 text-sm text-slate-400">{activeTest.testId}</p>
            <p className="mt-3 break-words text-sm leading-7 text-slate-300">{activeTest.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MetaPill label={activeTest.priority} tone={priorityTone(activeTest.priority)} />
              <MetaPill label={activeTest.category} />
              <MetaPill label={activeTest.status ?? "PASS"} tone={(activeTest.status ?? "PASS") === "FAIL" ? "fail" : "pass"} />
              <MetaPill label={activeTest.affectedFlow ?? toRoute(activeTest.sourcePage)} />
              <MetaPill label={activeTest.sourceLabel ?? describeSourceKind(activeTest.sourceKind)} />
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Interpretation</p>
            <p className="mt-3 break-words text-sm leading-7 text-slate-200">
              {buildCaseMeaning(activeTest)}
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Why this case exists</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <DetailCard label="Generated from" value={activeTest.sourceLabel ?? describeSourceKind(activeTest.sourceKind)} helper="The analysis source that produced this case." />
              <DetailCard label="Likely owner" value={activeTest.ownerHint ?? "Frontend"} helper="The team or area that should triage this first." />
              <DetailCard label="User impact" value={activeTest.userImpact ?? "No user-impact summary was generated for this case."} helper="What a real user is likely to feel when this issue happens." />
              <DetailCard label="Confidence" value={toTitle(activeTest.confidence ?? "medium")} helper={describeConfidence(activeTest.confidence ?? "medium")} />
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Steps</p>
            <div className="mt-3 grid gap-2">
              {activeTest.steps.map((step, index) => (
                <div key={`${activeTest.testId}-${index}`} className="min-w-0 break-words rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3 text-xs leading-6 text-slate-300">
                  <span className="mr-2 text-cyan-300">{String(index + 1).padStart(2, "0")}</span>
                  {step}
                </div>
              ))}
            </div>
          </div>

          {evidenceItems.length > 0 ? (
            <div className="min-w-0 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-rose-200">Evidence</p>
              <div className="mt-3 grid gap-2">
                {evidenceItems.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3 text-sm text-slate-100">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTest.suggestions && activeTest.suggestions.length > 0 ? (
            <div className="min-w-0 rounded-2xl border border-amber-300/20 bg-amber-400/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-200">Suggestions</p>
              <div className="mt-3 grid gap-2">
                {activeTest.suggestions.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-3 text-sm text-slate-200">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTest.screenshotUrl ? (
            <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Screenshot</p>
              <img
                src={`${apiBaseUrl}${activeTest.screenshotUrl}`}
                alt={activeTest.title}
                className="mt-3 w-full rounded-2xl border border-white/10 object-cover shadow-[0_12px_35px_rgba(2,6,23,0.45)]"
              />
            </div>
          ) : null}

          {activeTest.beforeScreenshotUrl || activeTest.afterScreenshotUrl || activeTest.domDiffSummary ? (
            <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Diff</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                <DiffFrame title="Before" imageUrl={activeTest.beforeScreenshotUrl ? `${apiBaseUrl}${activeTest.beforeScreenshotUrl}` : undefined} />
                <DiffFrame title="After" imageUrl={activeTest.afterScreenshotUrl ? `${apiBaseUrl}${activeTest.afterScreenshotUrl}` : undefined} />
              </div>
              {activeTest.domDiffSummary ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-200">
                  {activeTest.domDiffSummary}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="min-w-0 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Expected</p>
            <p className="mt-3 break-words text-sm leading-7 text-slate-100">{activeTest.expectedResult}</p>
          </div>
        </article>
      </section>
    </section>
  );
}

function toRoute(value: string) {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return value;
  }
}

function DiffFrame({ title, imageUrl }: { title: string; imageUrl?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{title}</p>
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="mt-3 h-[240px] w-full rounded-2xl border border-white/10 object-cover" />
      ) : (
        <div className="mt-3 flex h-[240px] items-center justify-center rounded-2xl border border-white/10 bg-slate-950/60 text-xs text-slate-500">
          No image
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "fail" | "pass" | "warn";
}) {
  return (
    <div className={`rounded-2xl border px-4 py-4 ${surfaceTone(tone)}`}>
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{helper}</p>
    </div>
  );
}

function MetaPill({ label, tone = "default" }: { label: string; tone?: "default" | "fail" | "pass" | "warn" }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs text-slate-100 ${surfaceTone(tone)}`}>{label}</span>
  );
}

function DetailCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-white">{value}</p>
      <p className="mt-2 text-xs leading-6 text-slate-400">{helper}</p>
    </div>
  );
}

function describeSourceKind(kind?: string) {
  switch (kind) {
    case "failure_cluster":
      return "Repeated interaction failure cluster";
    case "runtime_finding":
      return "Runtime finding";
    case "scenario":
      return "Targeted scenario";
    case "page_smoke":
      return "Baseline smoke check";
    default:
      return "Analysis-generated case";
  }
}

function describeConfidence(confidence: "high" | "medium" | "low") {
  switch (confidence) {
    case "high":
      return "This case is backed by direct runtime or repeated interaction evidence.";
    case "medium":
      return "This case is credible, but some interpretation was added during generation.";
    case "low":
      return "This case is more heuristic and should be validated before escalation.";
    default:
      return "Confidence was not classified for this case.";
  }
}

function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildFocusMessage(
  summary: { total: number; failed: number; critical: number; routes: number; sourceKinds: number; interactionsTested: number; interactionsDetected: number; passed: number },
) {
  if (summary.failed > 0) {
    const criticalText = summary.critical > 0 ? `${summary.critical} of them are critical.` : "None of the current failures are marked critical.";
    return `${summary.failed} failure case${summary.failed === 1 ? "" : "s"} are in the current slice across ${summary.routes} route${summary.routes === 1 ? "" : "s"}. ${criticalText} Passed checks are suppressed so the page stays focused on triage.`;
  }

  return `${summary.passed} visible case${summary.passed === 1 ? "" : "s"} passed in this slice. Use them as coverage evidence across ${summary.routes} route${summary.routes === 1 ? "" : "s"} and ${summary.sourceKinds} analysis source${summary.sourceKinds === 1 ? "" : "s"}.`;
}

function buildCaseMeaning(test: AnalysisResponse["testCases"][number]) {
  const status = test.status ?? "PASS";
  const route = test.affectedFlow ?? toRoute(test.sourcePage);
  const source = test.sourceLabel ?? describeSourceKind(test.sourceKind);
  const impact = test.userImpact ?? "The user impact was not summarized for this case.";
  return `${test.priority} ${test.category} ${status === "FAIL" ? "failure" : "check"} on ${route}. It was generated from ${source.toLowerCase()} and indicates: ${impact}`;
}

function statusTone(value: "PASS" | "FAIL") {
  return value === "FAIL"
    ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
    : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200";
}

function priorityTone(value: string): "default" | "fail" | "pass" | "warn" {
  switch (value) {
    case "P0":
      return "fail";
    case "P1":
      return "warn";
    default:
      return "default";
  }
}

function surfaceTone(tone: "default" | "fail" | "pass" | "warn") {
  switch (tone) {
    case "fail":
      return "border-rose-300/20 bg-rose-400/10";
    case "pass":
      return "border-emerald-300/20 bg-emerald-400/10";
    case "warn":
      return "border-amber-300/20 bg-amber-400/10";
    default:
      return "border-white/10 bg-white/5";
  }
}
