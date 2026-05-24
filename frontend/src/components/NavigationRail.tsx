import type { AppView } from "../types/analysis";

type NavigationRailProps = {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
};

export const navigationItems: Array<{ id: AppView; label: string; short: string }> = [
  { id: "overview", label: "Overview", short: "OV" },
  { id: "run", label: "Run Lab", short: "RN" },
  { id: "pages", label: "Pages", short: "PG" },
  { id: "findings", label: "Findings", short: "FD" },
  { id: "tests", label: "Tests", short: "TS" },
  { id: "report", label: "Report", short: "RP" },
  { id: "history", label: "History", short: "HS" },
  { id: "compare", label: "Compare", short: "CP" },
];

export function NavigationRail({ activeView, onViewChange }: NavigationRailProps) {
  return (
    <aside className="rounded-[2rem] border border-white/10 bg-slate-950/88 p-4 shadow-[0_30px_90px_rgba(2,6,23,0.42)]">
      <div className="flex items-center gap-3 rounded-[1.6rem] border border-cyan-300/15 bg-cyan-400/8 px-3 py-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-400/10 text-sm font-semibold text-cyan-300">
          SK
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-300">SK CrawlPulse</p>
          <p className="truncate text-sm text-slate-300">Dense workspace</p>
        </div>
      </div>

      <nav className="mt-5 grid gap-2">
        {navigationItems.map((item) => {
          const active = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 rounded-[1.2rem] border px-3 py-3 text-left transition ${
                active
                  ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                  : "border-transparent bg-white/[0.03] text-slate-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-200"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 text-[11px] font-semibold uppercase tracking-[0.16em]">
                {item.short}
              </span>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
