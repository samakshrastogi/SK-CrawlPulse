import { useState } from "react";
import type { AuthSession } from "./AuthPage";
import type { AppNotification } from "../types/analysis";

type TopBarProps = {
  user: AuthSession;
  notifications: AppNotification[];
  unreadCount: number;
  onMarkNotificationRead: (notificationId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onSignOut: () => void;
};

export function TopBar({
  user,
  notifications,
  unreadCount,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onSignOut,
}: TopBarProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const initial = (user.name || user.email).charAt(0).toUpperCase();
  const visibleNotifications = notifications.slice(0, 8);

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
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen((current) => !current)}
              className="control-surface tab-motion flex h-9 w-9 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="block h-3.5 w-3.5 rounded-[0.45rem] border border-current/80" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-300 px-1 text-[9px] font-bold leading-none text-slate-950">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </span>
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 top-11 z-50 w-[360px] overflow-hidden rounded-[1.1rem] border border-white/10 bg-slate-950/96 shadow-[0_24px_70px_rgba(2,6,23,0.5)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-300">Notifications</p>
                    <p className="mt-1 text-xs text-slate-400">{unreadCount} unread</p>
                  </div>
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    disabled={unreadCount === 0}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto p-2">
                  {visibleNotifications.length > 0 ? (
                    visibleNotifications.map((notification) => (
                      <button
                        key={notification.notificationId}
                        type="button"
                        onClick={() => onMarkNotificationRead(notification.notificationId)}
                        className={`block w-full rounded-[0.9rem] border px-3 py-3 text-left transition ${
                          notification.readAt
                            ? "border-transparent bg-white/[0.03] text-slate-300"
                            : "border-cyan-300/20 bg-cyan-400/10 text-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm font-semibold">{notification.title}</p>
                          <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-slate-600" : "bg-cyan-300"}`} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">{notification.message}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                          <span>{formatNotificationTime(notification.createdAt)}</span>
                          <span>{notification.emailStatus === "sent" ? "Email sent" : notification.emailStatus}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      No notifications yet.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
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

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
