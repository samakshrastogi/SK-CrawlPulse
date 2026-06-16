import { navigationItems } from "../data/navigationItems";
import type { AppView } from "../types/analysis";

type MobileNavigationDrawerProps = {
  activeView: AppView;
  open: boolean;
  onClose: () => void;
  onViewChange: (view: AppView) => void;
};

export function MobileNavigationDrawer({
  activeView,
  open,
  onClose,
  onViewChange,
}: MobileNavigationDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button type="button" className="absolute inset-0 bg-slate-950/72 backdrop-blur-sm" onClick={onClose} aria-label="Close navigation" />
      <aside className="mobile-drawer-panel absolute left-0 top-0 h-full w-[86%] max-w-[320px] overflow-y-auto border-r border-white/10 bg-slate-950/96 p-4 shadow-[0_30px_90px_rgba(2,6,23,0.52)] fade-in-up">
        <div className="flex items-center justify-between gap-3 rounded-[1.15rem] border border-cyan-300/15 bg-cyan-400/8 px-3 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border border-cyan-300/20 bg-cyan-400/10 text-sm font-semibold text-cyan-300">
              SK
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] uppercase tracking-[0.18em] text-cyan-300">SK CrawlPulse</p>
              <p className="truncate text-sm text-slate-300">Mobile workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300"
          >
            Close
          </button>
        </div>

        <nav className="mt-5 grid gap-2">
          {navigationItems.map((item) => {
            const active = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onViewChange(item.id);
                  onClose();
                }}
                className={`flex items-center gap-3 rounded-[1rem] border px-3 py-3 text-left transition ${
                  active
                    ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                    : "border-transparent bg-white/[0.03] text-slate-400"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-900/70 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {item.short}
                </span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
