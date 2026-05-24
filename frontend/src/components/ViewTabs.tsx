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

const tabs: Array<{ id: AppView; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "run", label: "Run" },
  { id: "pages", label: "Pages" },
  { id: "findings", label: "Findings" },
  { id: "tests", label: "Tests" },
  { id: "report", label: "Report" },
  { id: "history", label: "History" },
  { id: "compare", label: "Compare" },
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
    <section className="glass-surface hidden rounded-[1.35rem] px-3 py-3 md:block fade-in-up">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-center">
        <div className="segmented-control flex flex-wrap items-center justify-center gap-2 rounded-[1.2rem] p-2">
          {tabs.map((tab) => {
            const active = tab.id === activeView;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onViewChange(tab.id)}
                className={`tab-motion segmented-option rounded-full px-4 py-2 text-[13px] transition ${
                  active
                    ? "segmented-option-active bg-[linear-gradient(180deg,rgba(34,211,238,0.18),rgba(14,116,144,0.12))] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_20px_rgba(8,145,178,0.18)]"
                    : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
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
            className="flex w-full items-center justify-between gap-3 rounded-[1.1rem] border border-white/10 bg-slate-950/68 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-cyan-300/20 hover:bg-slate-950/76"
            aria-haspopup="menu"
            aria-expanded={websiteMenuOpen}
          >
            <span className="shrink-0 text-[11px] uppercase tracking-[0.22em] text-cyan-300">Website</span>
            <span className="min-w-0 flex-1 truncate text-sm text-white">{websiteLabel}</span>
            <span
              className={`shrink-0 text-xs text-slate-300 transition ${websiteMenuOpen ? "rotate-180" : ""}`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>

        </div>
      </div>
      {websiteMenuOpen && websiteMenuStyle
        ? createPortal(
            <div
              ref={websiteMenuRef}
              className="glass-surface fixed z-[90] rounded-[1.15rem] border border-cyan-300/12 bg-slate-950/96 p-2 shadow-[0_24px_60px_rgba(2,6,23,0.48)] backdrop-blur-xl"
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
