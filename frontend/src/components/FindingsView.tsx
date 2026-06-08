import { useEffect, useMemo, useState } from "react";
import { runtime } from "../config/runtime";
import { getFindingMeta, getSeverityMeaning } from "../data/findingMeta";
import { EmptyStatePanel } from "./EmptyStatePanel";
import type { AnalysisResponse, GlobalFilters } from "../types/analysis";

type FindingsViewProps = {
  result: AnalysisResponse | null;
  filters: GlobalFilters;
};

type TriageStatus = "open" | "acknowledged" | "ignored" | "fixed";
const TRIAGE_KEY_PREFIX = "sk-crawlpulse:finding-triage";

export function FindingsView({ result, filters }: FindingsViewProps) {
  const [groupBy, setGroupBy] = useState<"priority" | "route" | "type">("priority");
  const [showGlossary, setShowGlossary] = useState(false);
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({});
  const [triage, setTriage] = useState<Record<string, TriageStatus>>({});
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

  useEffect(() => {
    if (!result?.runId) {
      setTriage({});
      return;
    }

    const key = `${TRIAGE_KEY_PREFIX}:${result.runId}`;
    const stored = window.localStorage.getItem(key);
    if (!stored) {
      setTriage({});
      return;
    }

    try {
      setTriage(JSON.parse(stored) as Record<string, TriageStatus>);
    } catch {
      window.localStorage.removeItem(key);
      setTriage({});
    }
  }, [result?.runId]);

  useEffect(() => {
    if (!result?.runId) {
      return;
    }

    window.localStorage.setItem(`${TRIAGE_KEY_PREFIX}:${result.runId}`, JSON.stringify(triage));
  }, [result?.runId, triage]);

  const severityCounts = useMemo(
    () => ({
      high: filteredFindings.filter((finding) => finding.severity === "high").length,
      medium: filteredFindings.filter((finding) => finding.severity === "medium").length,
      low: filteredFindings.filter((finding) => finding.severity === "low").length,
    }),
    [filteredFindings],
  );

  const topType = useMemo(
    () => getTopGroup(filteredFindings, (finding) => getFindingMeta(finding.type).label),
    [filteredFindings],
  );

  const triageCounts = useMemo(() => {
    const counts: Record<TriageStatus, number> = {
      open: 0,
      acknowledged: 0,
      ignored: 0,
      fixed: 0,
    };

    filteredFindings.forEach((finding) => {
      counts[triage[finding.findingId] ?? "open"] += 1;
    });

    return counts;
  }, [filteredFindings, triage]);

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
        actionLabel="Next step"
        tone="fail"
      />
    );
  }

  return (
    <section className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-4">
        <SummaryCard label="Visible findings" value={String(filteredFindings.length)} detail="After current filters" />
        <SummaryCard label="High severity" value={String(severityCounts.high)} detail="Needs attention now" />
        <SummaryCard label="Triage open" value={String(triageCounts.open)} detail={`${triageCounts.acknowledged} acknowledged / ${triageCounts.fixed} fixed`} />
        <SummaryCard label="Top issue type" value={topType?.label ?? "--"} detail={topType ? `${topType.count} finding${topType.count === 1 ? "" : "s"}` : "No type concentration"} />
      </div>

      <article className="findings-desk-console rounded-[20px] border border-slate-700 bg-[#1E293B] p-5 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">View controls</p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{recommendedFocus}</p>
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
                  groupBy === key
                    ? "border-transparent bg-[linear-gradient(135deg,#15616D,#26C6DA)] text-white shadow-[0_10px_24px_rgba(38,198,218,0.22)]"
                    : "border-white/20 bg-white text-slate-700 hover:bg-cyan-50"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowGlossary((value) => !value)}
              className="tab-motion rounded-full border border-white/20 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-cyan-50"
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
                <article key={type} className="finding-type-card rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-sm font-semibold text-white">{meta.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{meta.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-300">Why this matters</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{meta.impact}</p>
                </article>
              );
            })}
          </div>
        ) : null}
      </article>

      <div className="grid gap-4">
        {filteredFindings.length > 0 ? visibleGroups.map((group) => (
          <section key={group.key} className="grid gap-3">
            <div className="enterprise-card flex items-center justify-between gap-3 rounded-[20px] px-5 py-4">
              <div>
                <p className="text-base font-semibold text-slate-900">{group.label}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {group.items.length} finding{group.items.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            {group.items.map((finding) => {
              const meta = getFindingMeta(finding.type);
              const interaction = interactions.find((item) => item.buttonId === finding.relatedInteractionId);
              const page = pages.find((item) => item.url === finding.pageUrl);
              const isExpanded = Boolean(expandedFindings[finding.findingId]);
              const triageStatus = triage[finding.findingId] ?? "open";
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
                <article key={finding.findingId} className="finding-card enterprise-card rounded-[20px] p-5 transition duration-200 fade-in-up hover:-translate-y-0.5 hover:shadow-[0_18px_46px_rgba(0,0,0,0.1)]">
                  <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_180px]">
                    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50">
                      {finding.screenshotUrl ? (
                        <img
                          src={`${apiBaseUrl}${finding.screenshotUrl}`}
                          alt={finding.summary}
                          className="h-[168px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-[168px] items-center justify-center text-xs text-slate-500">
                          No screenshot
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="min-w-0">
                        <div className="min-w-0">
                          <p className="break-words text-lg font-semibold text-slate-900">{finding.summary}</p>
                          <p className="mt-2 break-words text-[15px] leading-7 text-slate-600">{smartSummary}</p>
                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Route: {toRoute(finding.pageUrl)}</span>
                            <span>Impact: {toImpactLine(finding.severity, meta.impact)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-2">
                        <CompactRow label="Top evidence" value={evidencePreview ?? "No evidence details recorded"} />
                        {extraEvidenceCount > 0 ? (
                          <CompactRow label="More evidence" value={`+${extraEvidenceCount} more item${extraEvidenceCount === 1 ? "" : "s"}`} />
                        ) : null}
                        <CompactRow
                          label="Next step"
                          value={interaction?.selector ? `Inspect ${interaction.selector} and the surrounding flow.` : meta.suggestions[0]}
                        />
                      </div>

                      <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <p className="enterprise-label">Triage</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(["open", "acknowledged", "ignored", "fixed"] as TriageStatus[]).map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() =>
                                setTriage((current) => ({
                                  ...current,
                                  [finding.findingId]: status,
                                }))
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs capitalize ${
                                triageStatus === status
                                  ? triageTone(status)
                                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-cyan-50"
                              }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 lg:hidden">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedFindings((current) => ({
                              ...current,
                              [finding.findingId]: !current[finding.findingId],
                            }))
                          }
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-cyan-50"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 grid gap-4">
                          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="enterprise-label">Details</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{finding.details}</p>
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
                            <p className="enterprise-label">{meta.evidenceLabel} evidence</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {finding.evidence.length > 0 ? (
                                finding.evidence.slice(0, 6).map((item) => (
                                  <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                                    {item}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
                                  No evidence details recorded
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <aside className="flex flex-col items-start justify-between gap-4 lg:items-end">
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Badge value={finding.severity} tone={finding.severity} />
                        <Badge value={meta.label} />
                        <Badge value={triageStatus} tone={triageStatus} />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedFindings((current) => ({
                            ...current,
                            [finding.findingId]: !current[finding.findingId],
                          }))
                        }
                        className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-cyan-50 lg:inline-flex"
                      >
                        {isExpanded ? "Hide details" : "View details"}
                      </button>
                    </aside>
                  </div>
                </article>
              );
            })}
          </section>
        )) : (
          <EmptyStatePanel
            title="No findings match"
            actionLabel="Try"
            tone="warn"
          />
        )}
      </div>
    </section>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <article className="enterprise-card rounded-[20px] px-5 py-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(0,0,0,0.09)]">
      <p className="enterprise-label">{label}</p>
      <p className="mt-3 break-words text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className="enterprise-label">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function CompactRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-start gap-2 text-sm">
      <span className="font-medium text-slate-500">{label}:</span>
      <span className="min-w-0 flex-1 text-slate-700">{value}</span>
    </div>
  );
}

function Badge({ value, tone }: { value: string; tone?: string }) {
  const color =
    tone === "critical"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "high"
      ? "border-orange-200 bg-orange-50 text-orange-700"
      : tone === "medium"
        ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "low"
          ? "border-blue-200 bg-blue-50 text-blue-700"
      : tone === "info"
            ? "border-slate-200 bg-slate-50 text-slate-600"
            : tone === "open"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : tone === "acknowledged"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : tone === "ignored"
                  ? "border-slate-200 bg-slate-100 text-slate-600"
                  : tone === "fixed"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-white text-slate-600";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${color}`}>{value}</span>;
}

function triageTone(status: TriageStatus) {
  switch (status) {
    case "fixed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "ignored":
      return "border-slate-200 bg-slate-100 text-slate-600";
    case "acknowledged":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-rose-200 bg-rose-50 text-rose-700";
  }
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
