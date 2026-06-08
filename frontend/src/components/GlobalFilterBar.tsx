import { useMemo } from "react";
import type { AnalysisResponse, AnalysisRun, GlobalFilters } from "../types/analysis";

type GlobalFilterBarProps = {
  filters: GlobalFilters;
  onChange: (next: GlobalFilters) => void;
  result: AnalysisResponse | null;
  currentRun: AnalysisRun | null;
  compactHeader?: boolean;
};

export function GlobalFilterBar({ filters, onChange, result, currentRun, compactHeader = false }: GlobalFilterBarProps) {
  const routeOptions = useMemo(() => {
    const sources = [
      ...(result?.frontend.pages.map((page) => page.routePath) ?? []),
      ...(result?.frontend.runtimeFindings.map((finding) => toRoute(finding.pageUrl)) ?? []),
      ...(result?.testCases.map((testCase) => toRoute(testCase.sourcePage)) ?? []),
      ...(currentRun?.pages.map((page) => page.routePath) ?? []),
    ];

    return ["all", ...Array.from(new Set(sources.filter(Boolean)))];
  }, [currentRun?.pages, result]);

  const issueTypes = useMemo(() => {
    const types = [
      ...(result?.frontend.runtimeFindings.map((finding) => finding.type) ?? []),
      ...(result?.testCases.map((testCase) => testCase.category) ?? []),
    ];

    return ["all", ...Array.from(new Set(types.filter(Boolean)))];
  }, [result]);

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/82 p-4">
      {compactHeader ? null : (
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">Global filters</p>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                website: "",
                route: "all",
                status: "all",
                severity: "all",
                issueType: "all",
              })
            }
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300"
          >
            Reset
          </button>
        </div>
      )}

      {compactHeader ? (
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={() =>
              onChange({
                website: "",
                route: "all",
                status: "all",
                severity: "all",
                issueType: "all",
              })
            }
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-300"
          >
            Reset
          </button>
        </div>
      ) : null}

      <div className={`${compactHeader ? "" : "mt-4"} grid gap-3 sm:grid-cols-2 2xl:grid-cols-4`}>
        <FilterSelect
          label="Route"
          value={filters.route}
          options={routeOptions}
          onChange={(route) => onChange({ ...filters, route })}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          options={["all", "PASS", "FAIL", "queued", "running", "completed", "failed"]}
          onChange={(status) => onChange({ ...filters, status: status as GlobalFilters["status"] })}
        />
        <FilterSelect
          label="Severity"
          value={filters.severity}
          options={["all", "high", "medium", "low"]}
          onChange={(severity) => onChange({ ...filters, severity: severity as GlobalFilters["severity"] })}
        />
        <FilterSelect
          label="Issue type"
          value={filters.issueType}
          options={issueTypes}
          onChange={(issueType) => onChange({ ...filters, issueType })}
        />
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] uppercase tracking-[0.22em] text-slate-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function toRoute(value: string) {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return value;
  }
}
