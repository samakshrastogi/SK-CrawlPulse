import { useMemo, useState } from "react";
import { runtime } from "../config/runtime";
import { getFindingMeta, getSeverityMeaning } from "../data/findingMeta";
import { EmptyStatePanel } from "./EmptyStatePanel";
import type { AnalysisResponse, GlobalFilters } from "../types/analysis";

type FindingsViewProps = {
  result: AnalysisResponse | null;
  filters: GlobalFilters;
};

export function FindingsView({ result, filters }: FindingsViewProps) {
  const [groupBy, setGroupBy] = useState<"priority" | "route" | "type">("priority");
  const [showGlossary, setShowGlossary] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const apiBaseUrl = runtime.apiBaseUrl;
  const findings = result?.frontend.runtimeFindings ?? [];
  const pages = result?.frontend.pages ?? [];
  const interactions = result?.frontend.interactionResults ?? [];

  const filteredFindings = useMemo(
    () =>
      findings.filter((finding) => {
        const severityOk = filters.severity === "all" || finding.severity === filters.severity;
        const typeOk = filters.issueType === "all" || finding.type === filters.issueType;
        const routeOk = filters.route === "all" || toRoute(finding.pageUrl) === filters.route;
        return severityOk && typeOk && routeOk;
      }),
    [filters.issueType, filters.route, filters.severity, findings],
  );

  const severityCounts = useMemo(
    () => ({
      high: filteredFindings.filter((finding) => finding.severity === "high").length,
      medium: filteredFindings.filter((finding) => finding.severity === "medium").length,
      low: filteredFindings.filter((finding) => finding.severity === "low").length,
    }),
    [filteredFindings],
  );

  const topRoute = useMemo(() => getTopGroup(filteredFindings, (finding) => toRoute(finding.pageUrl)), [filteredFindings]);
  const topType = useMemo(
    () => getTopGroup(filteredFindings, (finding) => getFindingMeta(finding.type).label),
    [filteredFindings],
  );

  const recommendedFocus = useMemo(() => {
    const highPriority = filteredFindings.filter((finding) => toPriorityBucket(finding.severity) === "Needs attention now");
    const source = highPriority.length > 0 ? highPriority : filteredFindings;
    const route = getTopGroup(source, (finding) => toRoute(finding.pageUrl));
    const type = getTopGroup(source, (finding) => getFindingMeta(finding.type).label);

    if (!route && !type) {
      return "No visible findings in the current filter set.";
    }

    return `Start with ${route?.label ?? "the most affected route"} because it has ${
      route?.count ?? source.length
    } visible finding${(route?.count ?? source.length) === 1 ? "" : "s"}${
      type ? `, led by ${type.label.toLowerCase()} issues.` : "."
    }`;
  }, [filteredFindings]);

  const visibleGroups = useMemo(() => {
    const grouped = new Map<string, typeof filteredFindings>();
    filteredFindings.forEach((finding) => {
      const key =
        groupBy === "route"
          ? toRoute(finding.pageUrl)
          : groupBy === "type"
            ? getFindingMeta(finding.type).label
            : toPriorityBucket(finding.severity);
      const existing = grouped.get(key) ?? [];
      existing.push(finding);
      grouped.set(key, existing);
    });

    return Array.from(grouped.entries())
      .map(([key, items]) => ({ key, label: key, items }))
      .sort((left, right) => groupSortWeight(left.label) - groupSortWeight(right.label) || right.items.length - left.items.length || left.label.localeCompare(right.label));
  }, [filteredFindings, groupBy]);

  if (!result) {
    return (
      <EmptyStatePanel
        title="No findings yet"
        description="Findings populate after a run captures runtime issues, assertions, accessibility checks, or failures."
        actionLabel="Next step"
        actionHint="Start a scan from Run."
        tone="fail"
      />
    );
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-3 lg:grid-cols-4">
        <SummaryCard label="Visible findings" value={String(filteredFindings.length)} detail="After current filters" />
        <SummaryCard label="High severity" value={String(severityCounts.high)} detail="Needs attention now" />
        <SummaryCard label="Top route" value={topRoute?.label ?? "--"} detail={topRoute ? `${topRoute.count} finding${topRoute.count === 1 ? "" : "s"}` : "No route concentration"} />
        <SummaryCard label="Top issue type" value={topType?.label ?? "--"} detail={topType ? `${topType.count} finding${topType.count === 1 ? "" : "s"}` : "No type concentration"} />
      </div>

      <article className="rounded-[1.6rem] border border-white/10 bg-slate-950/78 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">View controls</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400">{recommendedFocus}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ["priority", "Group by priority"],
              ["route", "Group by route"],
              ["type", "Group by type"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setGroupBy(key as typeof groupBy)}
                className={`tab-motion rounded-full border px-3 py-2 text-xs ${
                  groupBy === key ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowGlossary((value) => !value)}
              className="tab-motion rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
            >
              {showGlossary ? "Hide glossary" : "What types mean"}
            </button>
          </div>
        </div>

        {showGlossary ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-3">
            {Array.from(new Set(filteredFindings.map((finding) => finding.type))).slice(0, 6).map((type) => {
              const meta = getFindingMeta(type);
              return (
                <article key={type} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{meta.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">Why this matters</p>
                  <p className="mt-1 text-sm leading-6 text-slate-400">{meta.impact}</p>
                </article>
              );
            })}
          </div>
        ) : null}
      </article>

      <div className="grid gap-4">
        {filteredFindings.length > 0 ? visibleGroups.map((group) => (
          <section key={group.key} className="grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">{group.label}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                  {group.items.length} finding{group.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {group.items.map((finding) => {
              const meta = getFindingMeta(finding.type);
              const interaction = interactions.find((item) => item.buttonId === finding.relatedInteractionId);
              const page = pages.find((item) => item.url === finding.pageUrl);
              const isExpanded = Boolean(expandedFindings[finding.findingId]);
              const evidencePreview = finding.evidence[0];
              const extraEvidenceCount = Math.max(0, finding.evidence.length - 1);
              const smartSummary = toSmartSummary({
                summary: finding.summary,
                typeLabel: meta.label,
                route: toRoute(finding.pageUrl),
                interactionText: interaction?.text,
                interactionAction: interaction?.action,
              });

              return (
                <article key={finding.findingId} className={`rounded-[1.6rem] border p-5 fade-in-up ${severityShell(finding.severity)}`}>
                  <div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
                      {finding.screenshotUrl ? (
                        <img
                          src={`${apiBaseUrl}${finding.screenshotUrl}`}
                          alt={finding.summary}
                          className="h-[132px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-[132px] items-center justify-center text-xs text-slate-500">
                          No screenshot
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{finding.summary}</p>
                          <p className="mt-2 break-words text-sm text-slate-300">{smartSummary}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>Route: {toRoute(finding.pageUrl)}</span>
                            <span>Impact: {toImpactLine(finding.severity, meta.impact)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge value={meta.label} />
                          <Badge value={finding.severity} tone={finding.severity} />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2">
                        <CompactRow label="Top evidence" value={evidencePreview ?? "No evidence details recorded"} />
                        {extraEvidenceCount > 0 ? (
                          <CompactRow label="More evidence" value={`+${extraEvidenceCount} more item${extraEvidenceCount === 1 ? "" : "s"}`} />
                        ) : null}
                        <CompactRow
                          label="Next step"
                          value={interaction?.selector ? `Inspect ${interaction.selector} and the surrounding flow.` : meta.suggestions[0]}
                        />
                      </div>

                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedFindings((current) => ({
                              ...current,
                              [finding.findingId]: !current[finding.findingId],
                            }))
                          }
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 grid gap-4">
                          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Details</p>
                            <p className="mt-2 text-sm leading-6 text-slate-300">{finding.details}</p>
                          </div>

                          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <InfoBlock
                              label="Reproduction context"
                              value={toReproductionContext({
                                route: toRoute(finding.pageUrl),
                                pageTitle: page?.title,
                                interactionText: interaction?.text,
                                interactionAction: interaction?.action,
                                selector: interaction?.selector,
                              })}
                            />
                            <InfoBlock label="Risk interpretation" value={`${getSeverityMeaning(finding.severity)} ${meta.impact}`} />
                          </div>

                          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                            <InfoBlock label="What this type means" value={meta.description} />
                            <InfoBlock label="Suggested follow-up" value={meta.suggestions.join(" ")} />
                          </div>

                          <div>
                            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{meta.evidenceLabel} evidence</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {finding.evidence.length > 0 ? (
                                finding.evidence.slice(0, 6).map((item) => (
                                  <span key={item} className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-300">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-xs text-slate-500">
                                  No evidence details recorded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )) : (
          <EmptyStatePanel
            title="No findings match"
            description="This run has findings, but the current route, severity, or type filters hide them."
            actionLabel="Try"
            actionHint="Reset filters for the full issue list."
            tone="warn"
          />
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="rounded-[1.35rem] border border-white/10 bg-slate-950/70 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p>
    </div>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2 text-sm">
      <span className="text-slate-400">{label}:</span>
      <span className="min-w-0 flex-1 text-slate-200">{value}</span>
    </div>
  );
}

function Badge({ value, tone }: { value: string; tone?: string }) {
  const color =
    tone === "high"
      ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
      : tone === "medium"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
        : tone === "low"
          ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-200"
          : "border-white/10 bg-white/5 text-slate-300";

  return <span className={`rounded-full border px-3 py-1 text-xs ${color}`}>{value}</span>;
}

function severityShell(severity: "high" | "medium" | "low") {
  if (severity === "high") {
    return "border-rose-300/18 bg-[linear-gradient(135deg,rgba(63,28,45,0.58)_0%,rgba(15,23,42,0.82)_100%)]";
  }
  if (severity === "medium") {
    return "border-amber-300/18 bg-[linear-gradient(135deg,rgba(120,53,15,0.42)_0%,rgba(15,23,42,0.82)_100%)]";
  }
  return "border-cyan-300/18 bg-[linear-gradient(135deg,rgba(8,47,73,0.42)_0%,rgba(15,23,42,0.82)_100%)]";
}

function toRoute(value: string) {
  try {
    const url = new URL(value);
    return url.pathname || "/";
  } catch {
    return value;
  }
}

function getTopGroup<T>(items: T[], selector: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = selector(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))[0];
}

function toPriorityBucket(severity: "high" | "medium" | "low") {
  if (severity === "high") {
    return "Needs attention now";
  }
  if (severity === "medium") {
    return "Should review";
  }
  return "Lower priority";
}

function groupSortWeight(label: string) {
  if (label === "Needs attention now") {
    return 0;
  }
  if (label === "Should review") {
    return 1;
  }
  if (label === "Lower priority") {
    return 2;
  }
  return 3;
}

function toImpactLine(severity: "high" | "medium" | "low", impact: string) {
  if (severity === "high") {
    return "Likely user-blocking";
  }
  if (severity === "medium") {
    return impact.length > 64 ? `${impact.slice(0, 64).trim()}...` : impact;
  }
  return "Lower immediate risk";
}

function toSmartSummary({
  summary,
  typeLabel,
  route,
  interactionText,
  interactionAction,
}: {
  summary: string;
  typeLabel: string;
  route: string;
  interactionText?: string;
  interactionAction?: "click" | "fill" | "check" | "select";
}) {
  const actionPart =
    interactionText || interactionAction
      ? ` after ${interactionAction ?? "using"}${interactionText ? ` "${interactionText}"` : " the related action"}`
      : "";

  return `${typeLabel} on ${route}${actionPart}. ${summary}`;
}

function toReproductionContext({
  route,
  pageTitle,
  interactionText,
  interactionAction,
  selector,
}: {
  route: string;
  pageTitle?: string;
  interactionText?: string;
  interactionAction?: "click" | "fill" | "check" | "select";
  selector?: string;
}) {
  const parts = [`Open ${route}.`];

  if (pageTitle) {
    parts.push(`Confirm you are on ${pageTitle}.`);
  }

  if (interactionText || interactionAction || selector) {
    parts.push(
      `Reproduce the issue using ${interactionAction ?? "the related interaction"}${interactionText ? ` on "${interactionText}"` : ""}${
        selector ? ` (${selector})` : ""
      }.`,
    );
  } else {
    parts.push("Reproduce the state tied to this finding and compare the behavior against the recorded evidence.");
  }

  return parts.join(" ");
}
