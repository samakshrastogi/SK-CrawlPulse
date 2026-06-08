import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { AppView } from "../types/analysis";

type ViewTabsProps = {
  activeView: AppView;
  onViewChange: (view: AppView) => void;
  websiteOptions: string[];
  selectedWebsite: string;
  onWebsiteChange: (website: string) => void;
};

const tabs: Array<{ id: AppView; label: string; description: string }> = [
  { id: "overview", label: "Overview", description: "Executive signal" },
  { id: "run", label: "Run", description: "Launch and monitor" },
  { id: "pages", label: "Pages", description: "Routes and coverage" },
  { id: "findings", label: "Findings", description: "Triage evidence" },
  { id: "tests", label: "Tests", description: "Generated checks" },
  { id: "report", label: "Report", description: "Handoff summary" },
  { id: "history", label: "History", description: "Previous runs" },
  { id: "compare", label: "Compare", description: "Run deltas" },
];

export function ViewTabs({
  activeView,
  onViewChange,
  websiteOptions,
  selectedWebsite,
  onWebsiteChange,
}: ViewTabsProps) {
  const [websiteMenuOpen, setWebsiteMenuOpen] = useState(false);
  const [websiteMenuStyle, setWebsiteMenuStyle] = useState<CSSProperties | null>(null);
  const websiteMenuRef = useRef<HTMLDivElement | null>(null);
  const websiteTriggerRef = useRef<HTMLButtonElement | null>(null);

  const syncWebsiteMenuPosition = () => {
    if (!websiteTriggerRef.current) {
      setWebsiteMenuStyle(null);
      return;
    }

    const triggerRect = websiteTriggerRef.current.getBoundingClientRect();
    const width = Math.max(triggerRect.width, 280);
    const viewportPadding = 16;
    const left = Math.min(
      Math.max(triggerRect.right - width, viewportPadding),
      window.innerWidth - width - viewportPadding,
    );

    setWebsiteMenuStyle({
      position: "fixed",
      top: `${triggerRect.bottom + 10}px`,
      left: `${left}px`,
      width: `${width}px`,
    });
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        websiteMenuRef.current &&
        !websiteMenuRef.current.contains(target) &&
        websiteTriggerRef.current &&
        !websiteTriggerRef.current.contains(target)
      ) {
        setWebsiteMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!websiteMenuOpen) {
      setWebsiteMenuStyle(null);
      return;
    }

    syncWebsiteMenuPosition();
    window.addEventListener("resize", syncWebsiteMenuPosition);
    window.addEventListener("scroll", syncWebsiteMenuPosition, true);

    return () => {
      window.removeEventListener("resize", syncWebsiteMenuPosition);
      window.removeEventListener("scroll", syncWebsiteMenuPosition, true);
    };
  }, [websiteMenuOpen]);

  const websiteLabel = useMemo(() => selectedWebsite || "No websites", [selectedWebsite]);

  const websiteChoices = useMemo(() => websiteOptions, [websiteOptions]);

  return (
    <section className="navigation-console workspace-sidebar app-navbar-shell glass-surface hidden rounded-[1.35rem] px-3 py-3 md:block fade-in-up">
      <div className="grid gap-3">
        <div className="sidebar-context-card rounded-[1.15rem] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">Command center</p>
          <h2 className="mt-2 text-lg font-bold leading-tight text-white">CrawlPulse</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">AI testing, route coverage, and finding triage in one workspace.</p>
        </div>

        <div ref={websiteMenuRef} className="relative">
          <button
            ref={websiteTriggerRef}
            type="button"
            onClick={() =>
              setWebsiteMenuOpen((current) => {
                if (!current) {
                  syncWebsiteMenuPosition();
                }
                return !current;
              })
            }
            className="website-filter-trigger flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-slate-950/68 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-cyan-300/20 hover:bg-slate-950/76"
            aria-haspopup="menu"
            aria-expanded={websiteMenuOpen}
          >
            <span className="min-w-0">
              <span className="block text-[11px] uppercase tracking-[0.18em] text-cyan-300">Website</span>
              <span className="mt-1 block truncate text-sm text-white">{websiteLabel}</span>
            </span>
            <span
              className={`shrink-0 text-xs text-slate-300 transition ${websiteMenuOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              v
            </span>
          </button>

        </div>

        <div className="view-tab-strip segmented-control flex flex-col gap-1.5 rounded-[1.2rem] p-2">
          <p className="px-2 pb-1 pt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">Workspace</p>
          {tabs.map((tab) => {
            const active = tab.id === activeView;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onViewChange(tab.id)}
                style={
                  active
                    ? {
                        background: "linear-gradient(135deg, #15616D 0%, #26C6DA 52%, #7C3AED 100%)",
                        boxShadow: "0 14px 30px rgba(38, 198, 218, 0.24)",
                        color: "#FFFFFF",
                      }
                    : undefined
                }
                className={`tab-motion segmented-option rounded-full px-4 py-2 text-[13px] transition ${
                  active
                    ? "segmented-option-active enterprise-nav-active"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="tab-marker h-2.5 w-2.5 shrink-0 rounded-full" />
                  <span className="min-w-0 text-left">
                    <span className="block truncate text-sm font-semibold">{tab.label}</span>
                    <span className="tab-description mt-0.5 block truncate text-[11px] font-normal">{tab.description}</span>
                  </span>
                </span>
                <span className="tab-status-dot h-1.5 w-1.5 shrink-0 rounded-full" />
              </button>
            );
          })}
        </div>

        <div className="sidebar-insight-panel rounded-[1.15rem] px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Workflow</p>
          <div className="mt-3 grid gap-2 text-sm">
            <span className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full bg-cyan-300" /> Scan routes</span>
            <span className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full bg-orange-400" /> Detect risk</span>
            <span className="flex items-center gap-2 text-slate-300"><span className="h-2 w-2 rounded-full bg-violet-400" /> Package report</span>
          </div>
        </div>
      </div>
      {websiteMenuOpen && websiteMenuStyle
        ? createPortal(
            <div
              ref={websiteMenuRef}
              className="website-menu glass-surface fixed z-[90] rounded-[1.15rem] border border-cyan-300/12 bg-slate-950/96 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.48)] backdrop-blur-xl"
              role="menu"
              aria-label="Website filter"
              style={websiteMenuStyle}
            >
              {websiteChoices.map((website) => {
                const active = website === selectedWebsite;

                return (
                  <button
                    key={website}
                    type="button"
                    onClick={() => {
                      onWebsiteChange(website);
                      setWebsiteMenuOpen(false);
                    }}
                    className={`block w-full rounded-[0.95rem] px-3 py-2.5 text-left text-sm transition ${
                      active
                        ? "bg-cyan-400/12 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
                    }`}
                    role="menuitem"
                  >
                    {website}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
