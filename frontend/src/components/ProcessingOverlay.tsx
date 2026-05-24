import type { ProcessingStage } from "../types/analysis";

type ProcessingOverlayProps = {
  open: boolean;
  stages: ProcessingStage[];
  activeStageIndex: number;
  targetUrl: string;
};

export function ProcessingOverlay({
  open,
  stages,
  activeStageIndex,
  targetUrl,
}: ProcessingOverlayProps) {
  if (!open) {
    return null;
  }

  const activeStage = stages[activeStageIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.8rem] border border-cyan-300/20 bg-slate-950/95 p-6 shadow-[0_30px_100px_rgba(2,6,23,0.8)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Processing</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Running analysis</h2>
            <p className="mt-2 max-w-xl break-all text-xs leading-6 text-slate-400">
              {targetUrl}
            </p>
          </div>
          <div className="processing-pulse h-12 w-12 shrink-0 rounded-full border border-cyan-300/30 bg-cyan-400/10" />
        </div>

        <div className="mt-5 rounded-[1.4rem] border border-cyan-300/20 bg-cyan-400/8 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Current activity</p>
            <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-[11px] font-medium text-cyan-200">
              {activeStageIndex + 1} / {stages.length}
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold text-white">{activeStage.label}</p>
          <p className="mt-2 text-sm text-slate-200">{activeStage.summary}</p>
          <p className="mt-2 text-xs leading-6 text-slate-400">{activeStage.technical}</p>
        </div>

        <div className="mt-5 space-y-2.5">
          {stages.map((stage, index) => {
            const isDone = index < activeStageIndex;
            const isActive = index === activeStageIndex;

            return (
              <div
                key={stage.label}
                className={`rounded-2xl border px-4 py-3 transition ${
                  isActive
                    ? "border-cyan-300/40 bg-cyan-400/10"
                    : isDone
                      ? "border-emerald-300/25 bg-emerald-400/10"
                      : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{stage.label}</p>
                    <p className="mt-1 text-xs text-slate-300">{stage.summary}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium ${
                      isActive
                        ? "bg-cyan-300/20 text-cyan-200"
                        : isDone
                          ? "bg-emerald-300/20 text-emerald-200"
                          : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {isActive ? "In progress" : isDone ? "Completed" : "Queued"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
