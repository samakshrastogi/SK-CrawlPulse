type TopBarProps = {
  themeMode: "dark" | "light";
  onThemeToggle: () => void;
};

export function TopBar({ themeMode, onThemeToggle }: TopBarProps) {
  return (
    <header className="glass-surface glass-hover hidden rounded-[1.5rem] px-4 py-3 md:block fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[1.15rem] border border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(14,116,144,0.08))] text-sm font-semibold text-cyan-200 shadow-[0_12px_28px_rgba(8,145,178,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]">
            SK
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.42em] text-cyan-300/95">SK CrawlPulse</p>
            <span className="mt-0.5 block whitespace-nowrap text-[13px] text-slate-300/92">
              AI-powered testing operations console
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={onThemeToggle}
            className="control-surface tab-motion flex h-9 items-center gap-2 rounded-full px-3 text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            aria-label={`Switch to ${themeMode === "dark" ? "light" : "dark"} theme`}
            title={`Switch to ${themeMode === "dark" ? "light" : "dark"} theme`}
          >
            <span className="text-sm leading-none">{themeMode === "dark" ? "☀" : "☾"}</span>
            <span className="text-[12px]">{themeMode === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            type="button"
            className="control-surface tab-motion flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
            aria-label="Notifications"
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="block h-3.5 w-3.5 rounded-[0.45rem] border border-current/80" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-cyan-300" />
            </span>
          </button>
          <button
            type="button"
            className="control-surface tab-motion flex h-9 items-center gap-2 rounded-full pl-1.5 pr-3 text-slate-200 transition hover:bg-white/[0.08]"
            aria-label="Profile"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[linear-gradient(180deg,rgba(125,211,252,0.32),rgba(34,211,238,0.12))] text-[11px] font-semibold text-cyan-100">
              S
            </span>
            <span className="text-[12px] text-slate-300">Profile</span>
          </button>
        </div>
      </div>
    </header>
  );
}
