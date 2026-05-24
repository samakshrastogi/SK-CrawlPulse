import { runtime } from "../config/runtime";
import type { AnalysisResponse, AnalysisRun, AppView } from "../types/analysis";

type TopStatusStripProps = {
  activeView: AppView;
  currentRun: AnalysisRun | null;
  result: AnalysisResponse | null;
  onOpenFilters?: () => void;
  hasActiveFilters?: boolean;
};

export function TopStatusStrip({
  activeView,
  currentRun,
  result,
  onOpenFilters,
  hasActiveFilters,
}: TopStatusStripProps) {
  const runPreview =
    currentRun?.progress.liveSession ??
    (currentRun?.progress.pagesPreview?.[0]
      ? {
          url: currentRun.progress.pagesPreview[0].url,
          title: currentRun.progress.pagesPreview[0].title,
          html: currentRun.progress.pagesPreview[0].htmlPreview,
          previewImageUrl: currentRun.progress.pagesPreview[0].previewImageUrl,
        }
      : null);

  return (
    <section className="status-strip-shell rounded-[1.3rem] border border-white/10 bg-[linear-gradient(135deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.86)_48%,rgba(8,47,73,0.45)_100%)] px-5 py-3.5 shadow-[0_14px_38px_rgba(2,6,23,0.24)]">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        {activeView === "overview" ? (
          <div className="grid w-full items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Workspace</p>
              <h1 className="mt-1 text-[1.7rem] font-semibold leading-none text-white">{labelForView(activeView)}</h1>
              <p className="mt-2 max-w-[32rem] text-[13px] text-slate-400">
                {currentRun?.progress.summary ?? result?.frontend.baseUrl ?? "Run summary and triage overview"}
              </p>
            </div>

            <div className="flex justify-start lg:justify-end">
              {onOpenFilters ? (
                <button
                  type="button"
                  onClick={onOpenFilters}
                  className={`tab-motion rounded-full border px-3 py-1 text-[11px] ${
                    hasActiveFilters
                      ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  Filters
                </button>
              ) : null}
            </div>
          </div>
        ) : activeView === "run" ? (
          <div className="grid w-full gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] xl:items-stretch">
            <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-slate-950/72 p-2">
              <div className="flex items-center justify-between gap-2 rounded-[0.8rem] border border-white/8 bg-white/[0.04] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400/85" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-300/85" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-300/85" />
                </div>
                <span className="min-w-0 break-words text-[11px] text-slate-400">
                  {runPreview?.title ?? "Live preview"}
                </span>
              </div>
              <div className="mt-2 overflow-hidden rounded-[0.9rem] border border-white/10 bg-slate-950/70">
                {runPreview ? (
                  runPreview.previewImageUrl ? (
                    <img
                      src={`${runtime.apiBaseUrl}${runPreview.previewImageUrl}`}
                      alt={runPreview.title}
                      className="h-[220px] w-full object-contain bg-white"
                    />
                  ) : runPreview.html ? (
                    <iframe
                      title={runPreview.title}
                      srcDoc={runPreview.html}
                      className="h-[220px] w-full bg-white"
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
                      Preview not available.
                    </div>
                  )
                ) : (
                  <div className="flex h-[220px] items-center justify-center text-sm text-slate-500">
                    Waiting for live preview.
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Workspace</p>
              <h1 className="mt-1 text-[1.7rem] font-semibold leading-none text-white">{labelForView(activeView)}</h1>
              <p className="mt-2 max-w-[32rem] text-[13px] text-slate-400">
                {currentRun?.progress.summary ?? result?.frontend.baseUrl ?? "Live run preview"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {currentRun?.request.targetUrl ? (
                  <span className="max-w-full break-all rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                    {currentRun.request.targetUrl}
                  </span>
                ) : null}
                {runPreview?.url ? (
                  <span className="max-w-full break-all rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[11px] text-cyan-100">
                    {routeFromUrl(runPreview.url)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300">Workspace</p>
            <h1 className="mt-1 text-[1.7rem] font-semibold leading-none text-white">{labelForView(activeView)}</h1>
          </div>
        )}
      </div>
    </section>
  );
}

function routeFromUrl(value: string) {
  try {
    return new URL(value).pathname || "/";
  } catch {
    return value;
  }
}

function labelForView(view: AppView) {
  switch (view) {
    case "overview":
      return "Executive Overview";
    case "run":
      return "Run Workspace";
    case "pages":
      return "Route Explorer";
    case "findings":
      return "Findings Desk";
    case "tests":
      return "Test Matrix";
    case "report":
      return "Reporting";
    case "history":
      return "Run History";
    case "compare":
      return "Run Comparison";
    default:
      return "Workspace";
  }
}
