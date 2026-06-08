import type { AuthSession } from "./AuthPage";

type TopBarProps = {
  user: AuthSession;
  onSignOut: () => void;
};

export function TopBar({ user, onSignOut }: TopBarProps) {
  const initial = (user.name || user.email).charAt(0).toUpperCase();

  return (
    <header className="app-navbar-shell premium-header glass-surface glass-hover hidden rounded-[1.5rem] px-4 py-3 md:block fade-in-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="brand-mark flex h-9 w-9 shrink-0 items-center justify-center rounded-[1.15rem] text-sm font-semibold text-white">
            SK
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.42em] text-cyan-300/95">SK CrawlPulse</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2">
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
          <div className="control-surface flex min-h-9 items-center gap-2 rounded-full py-1 pl-1.5 pr-2 text-slate-200">
            <span className="profile-mark flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white">
              {initial}
            </span>
            <span className="hidden max-w-[180px] truncate text-[12px] text-slate-300 lg:inline">
              {user.name || user.email}
            </span>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-cyan-200">
              {user.provider}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              className="tab-motion rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
