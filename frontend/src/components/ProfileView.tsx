import type { AuthSession } from "./AuthPage";
import type { AnalysisRun, SavedProject } from "../types/analysis";

type ProfileViewProps = {
  user: AuthSession;
  runs: AnalysisRun[];
  savedProjects: SavedProject[];
  onSignOut: () => void;
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Unknown";
  }
};

const formatRelativeDate = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const days = Math.max(0, Math.floor((Date.now() - timestamp) / 86_400_000));
  if (days === 0) {
    return "Today";
  }
  if (days === 1) {
    return "Yesterday";
  }
  if (days < 30) {
    return `${days} days ago`;
  }
  return formatDate(value);
};

const toHostname = (targetUrl: string) => {
  try {
    return new URL(targetUrl).hostname;
  } catch {
    return targetUrl || "Unknown target";
  }
};

export function ProfileView({ user, runs, savedProjects, onSignOut }: ProfileViewProps) {
  const initial = (user.name || user.email).charAt(0).toUpperCase();
  const completedRuns = runs.filter((run) => run.status === "completed").length;
  const failedRuns = runs.filter((run) => run.status === "failed").length;
  const latestRun = runs[0];
  const pinnedProjects = savedProjects.filter((project) => project.pinned);
  const recentProjects = [...savedProjects]
    .sort((left, right) => new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime())
    .slice(0, 4);

  const stats = [
    { label: "Saved projects", value: savedProjects.length, detail: `${pinnedProjects.length} pinned` },
    { label: "Total runs", value: runs.length, detail: `${completedRuns} completed` },
    { label: "Failed runs", value: failedRuns, detail: failedRuns > 0 ? "Needs review" : "No failed runs" },
    { label: "Provider", value: user.provider === "google" ? "Google" : "Password", detail: "Authentication" },
  ];

  return (
    <section className="grid gap-4 fade-in-up">
      <article className="premium-header enterprise-card rounded-[24px] px-6 py-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="profile-mark flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.35rem] text-3xl font-bold text-white">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="enterprise-label text-cyan-700">User profile</p>
              <h1 className="mt-2 break-words text-[2rem] font-bold leading-tight text-slate-900">{user.name || user.email}</h1>
              <p className="mt-2 break-all text-sm text-slate-500">{user.email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="control-surface tab-motion rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:text-cyan-800"
          >
            Sign out
          </button>
        </div>
      </article>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <article key={item.label} className="enterprise-card rounded-[20px] px-5 py-5">
            <p className="enterprise-label">{item.label}</p>
            <p className="mt-3 text-[2rem] font-bold leading-none text-slate-900">{item.value}</p>
            <p className="mt-3 text-sm text-slate-500">{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <article className="insight-panel enterprise-card rounded-[20px] px-5 py-5">
          <p className="enterprise-label">Account details</p>
          <div className="mt-4 grid gap-3">
            <ProfileField label="Name" value={user.name || "Not set"} />
            <ProfileField label="Email" value={user.email} />
            <ProfileField label="Auth provider" value={user.provider === "google" ? "Google SSO" : "Email and password"} />
            <ProfileField label="Created" value={formatDate(user.createdAt)} />
          </div>
        </article>

        <article className="insight-panel enterprise-card rounded-[20px] px-5 py-5">
          <p className="enterprise-label">Workspace activity</p>
          <div className="mt-4 grid gap-3">
            <ProfileField
              label="Latest run"
              value={latestRun ? `${toHostname(latestRun.request.targetUrl)} - ${formatRelativeDate(latestRun.updatedAt)}` : "No runs yet"}
            />
            <ProfileField
              label="Latest status"
              value={latestRun ? latestRun.status.replace(/_/g, " ") : "No active run"}
            />
            <ProfileField
              label="Saved target coverage"
              value={`${new Set(savedProjects.map((project) => toHostname(project.targetUrl))).size} website${
                savedProjects.length === 1 ? "" : "s"
              }`}
            />
            <ProfileField
              label="Pinned projects"
              value={pinnedProjects.length > 0 ? pinnedProjects.map((project) => project.name).join(", ") : "None pinned"}
            />
          </div>
        </article>
      </div>

      <article className="enterprise-card rounded-[20px] px-5 py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="enterprise-label">Recent projects</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Saved workspace targets</h2>
          </div>
          <p className="text-sm text-slate-500">{savedProjects.length} total</p>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <div key={project.id} className="rounded-[16px] border border-slate-200 bg-white px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-900">{project.name}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{project.targetUrl}</p>
                  </div>
                  {project.pinned ? (
                    <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-800">
                      Pinned
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-xs text-slate-500">Last used {formatRelativeDate(project.lastUsedAt)}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-500 lg:col-span-2">
              No saved projects yet. Save a run target to populate this profile.
            </div>
          )}
        </div>
      </article>
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold capitalize text-slate-900">{value}</p>
    </div>
  );
}
