import { GlobalFilterBar } from "./GlobalFilterBar";
import type { AnalysisResponse, AnalysisRun, GlobalFilters } from "../types/analysis";

type GlobalFilterModalProps = {
  open: boolean;
  filters: GlobalFilters;
  onChange: (next: GlobalFilters) => void;
  onClose: () => void;
  result: AnalysisResponse | null;
  currentRun: AnalysisRun | null;
};

export function GlobalFilterModal({
  open,
  filters,
  onChange,
  onClose,
  result,
  currentRun,
}: GlobalFilterModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close filters"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/72 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-3xl fade-in-up">
        <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/96 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Global filters</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
            >
              Close
            </button>
          </div>
          <GlobalFilterBar
            filters={filters}
            onChange={onChange}
            result={result}
            currentRun={currentRun}
            compactHeader
          />
        </div>
      </div>
    </div>
  );
}
