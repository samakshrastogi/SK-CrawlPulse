import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AuthPage } from "./components/AuthPage";
import { CompareView } from "./components/CompareView";
import { FindingsView } from "./components/FindingsView";
import { GlobalFilterModal } from "./components/GlobalFilterModal";
import { HistoryView } from "./components/HistoryView";
import { LandingPage } from "./components/LandingPage";
import { MobileActionBar } from "./components/MobileActionBar";
import { MobileNavigationDrawer } from "./components/MobileNavigationDrawer";
import { OverviewView } from "./components/OverviewView";
import { PagesView } from "./components/PagesView";
import { ProfileView } from "./components/ProfileView";
import { ReportView } from "./components/ReportView";
import { RunView } from "./components/RunView";
import { TestsView } from "./components/TestsView";
import { TopBar } from "./components/TopBar";
import { TopStatusStrip } from "./components/TopStatusStrip";
import { ViewTabs } from "./components/ViewTabs";
import { runtime } from "./config/runtime";
import type { AuthSession } from "./components/AuthPage";
import type { AnalysisOptions, AnalysisResponse, AnalysisRun, AnalysisSubmission, AppNotification, AppView, GlobalFilters, SavedProject } from "./types/analysis";

const API_BASE_URL = runtime.apiBaseUrl;
const ANALYSIS_API_BASE_URL = `${API_BASE_URL}${runtime.analysisApiPath}`;
const NOTIFICATIONS_API_BASE_URL = `${API_BASE_URL}/api/notifications`;
const DEFAULT_ANALYSIS_OPTIONS = runtime.defaultAnalysisOptions;
const SAVED_PROJECTS_KEY = "sk-crawlpulse:saved-projects";
const APP_STATE_KEY = "sk-crawlpulse:app-state";
const AUTH_SESSION_KEY = "sk-crawlpulse:auth-session";
const PENDING_LANDING_URL_KEY = "sk-crawlpulse:pending-landing-url";

const createDefaultAnalysisOptions = (): AnalysisOptions => ({
  maxPages: DEFAULT_ANALYSIS_OPTIONS.maxPages,
  maxLinksPerPage: DEFAULT_ANALYSIS_OPTIONS.maxLinksPerPage,
  maxDepth: DEFAULT_ANALYSIS_OPTIONS.maxDepth,
  maxInteractionsPerPage: DEFAULT_ANALYSIS_OPTIONS.maxInteractionsPerPage,
  respectRobotsTxt: DEFAULT_ANALYSIS_OPTIONS.respectRobotsTxt,
  streamHtmlPreview: DEFAULT_ANALYSIS_OPTIONS.streamHtmlPreview,
  crawlProfile: DEFAULT_ANALYSIS_OPTIONS.crawlProfile,
  strictBehaviorMode: DEFAULT_ANALYSIS_OPTIONS.strictBehaviorMode,
  promptForLogin: DEFAULT_ANALYSIS_OPTIONS.promptForLogin,
  loginPrompt: {
    enabled: DEFAULT_ANALYSIS_OPTIONS.loginPromptEnabled,
    checkpointLabel: DEFAULT_ANALYSIS_OPTIONS.loginPromptLabel,
    timeoutSeconds: DEFAULT_ANALYSIS_OPTIONS.loginPromptTimeoutSeconds,
    autoContinueWithoutLogin: false,
  },
});

const toProjectName = (targetUrl: string) => {
  try {
    return new URL(targetUrl).hostname;
  } catch {
    return targetUrl || "project";
  }
};

const toWebsiteName = (targetUrl: string) => {
  const value = targetUrl.trim();
  if (!value) {
    return "";
  }

  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
};

const defaultWebsiteFilter = (runs: AnalysisRun[], fallbackUrl = "") => {
  const latestRun = runs[0];
  const latestWebsite = latestRun ? toWebsiteName(latestRun.request.targetUrl) : "";
  return latestWebsite || toWebsiteName(fallbackUrl) || "";
};

const mergeRunSnapshot = (previous: AnalysisRun | null, incoming: AnalysisRun): AnalysisRun => {
  if (!previous || previous.runId !== incoming.runId) {
    return incoming;
  }

  const preserveLiveCollections =
    !incoming.result && ["queued", "running", "awaiting_checkpoint"].includes(incoming.status);

  return {
    ...incoming,
    logs: preserveLiveCollections && incoming.logs.length === 0 ? previous.logs : incoming.logs,
    artifacts: preserveLiveCollections && (!incoming.artifacts || incoming.artifacts.length === 0)
      ? previous.artifacts
      : incoming.artifacts,
    pages: preserveLiveCollections && incoming.pages.length === 0 ? previous.pages : incoming.pages,
    interactions:
      preserveLiveCollections && incoming.interactions.length === 0 ? previous.interactions : incoming.interactions,
    failureClusters:
      preserveLiveCollections && incoming.failureClusters.length === 0
        ? previous.failureClusters
        : incoming.failureClusters,
    result: incoming.result ?? previous.result,
    error: incoming.error ?? previous.error,
  };
};

const parseGoogleCredential = (idToken: string): Pick<AuthSession, "email" | "name"> | null => {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(
      window.atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { email?: string; name?: string };

    if (!decoded.email) {
      return null;
    }

    return {
      email: decoded.email,
      name: decoded.name ?? decoded.email.split("@")[0] ?? "Google user",
    };
  } catch {
    return null;
  }
};

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => {
    try {
      const stored = window.localStorage.getItem(AUTH_SESSION_KEY);
      return stored ? (JSON.parse(stored) as AuthSession) : null;
    } catch {
      window.localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
  });
  const [authError, setAuthError] = useState("");
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [hasLandingIntent, setHasLandingIntent] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [uploadedPath, setUploadedPath] = useState("");
  const [analysisOptions, setAnalysisOptions] = useState<AnalysisOptions>(() => createDefaultAnalysisOptions());
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [currentRun, setCurrentRun] = useState<AnalysisRun | null>(null);
  const [historyRuns, setHistoryRuns] = useState<AnalysisRun[]>([]);
  const [comparisonRuns, setComparisonRuns] = useState<AnalysisRun[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [error, setError] = useState("");
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("overview");
  const [restored, setRestored] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [globalFilters, setGlobalFilters] = useState<GlobalFilters>({
    website: defaultWebsiteFilter([], ""),
    route: "all",
    status: "all",
    severity: "all",
    issueType: "all",
  });
  const streamRef = useRef<EventSource | null>(null);
  const hasActiveFilters =
    Boolean(globalFilters.website) ||
    globalFilters.route !== "all" ||
    globalFilters.status !== "all" ||
    globalFilters.severity !== "all" ||
    globalFilters.issueType !== "all";

  const unreadNotifications = notifications.filter((notification) => !notification.readAt).length;

  const websiteOptions = Array.from(
    new Set(
      [
        toWebsiteName(currentRun?.request.targetUrl ?? ""),
        toWebsiteName(targetUrl),
        ...historyRuns.map((run) => toWebsiteName(run.request.targetUrl)),
      ].filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));

  const filteredCurrentRun =
    !globalFilters.website
      ? currentRun
      : ([currentRun, ...historyRuns].filter((run): run is AnalysisRun => Boolean(run))).find(
          (run) => toWebsiteName(run.request.targetUrl) === globalFilters.website,
        ) ?? null;

  const filteredResult =
    !globalFilters.website
      ? result
      : filteredCurrentRun?.result ??
        historyRuns.find((run) => toWebsiteName(run.request.targetUrl) === globalFilters.website && run.result)?.result ??
        null;

  const fetchHistory = useCallback(async (fallbackTargetUrl = "") => {
    try {
      const response = await fetch(`${ANALYSIS_API_BASE_URL}/runs`);
      const runs = (await response.json()) as AnalysisRun[];
      if (response.ok) {
        setHistoryRuns(runs);
        setGlobalFilters((current) =>
          !current.website
            ? {
                ...current,
                website: defaultWebsiteFilter(runs, fallbackTargetUrl),
              }
            : current,
        );
      }
    } catch {
      // Keep current history state.
    }
  }, []);

  const fetchRun = useCallback(async (runId: string) => {
    const response = await fetch(`${ANALYSIS_API_BASE_URL}/runs/${runId}`);
    const run = (await response.json()) as AnalysisRun;
    if (!response.ok) {
      throw new Error("Failed to fetch run");
    }
    return run;
  }, []);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const idToken = hash.get("id_token");
    if (!idToken) {
      return;
    }

    const credential = parseGoogleCredential(idToken);
    if (!credential) {
      setAuthError("Google sign-in returned an unreadable token. Try again or use email login.");
      setShowAuthPage(true);
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      return;
    }

    const session: AuthSession = {
      ...credential,
      provider: "google",
      createdAt: new Date().toISOString(),
    };
    setAuthSession(session);
    setShowAuthPage(false);
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  const authenticate = (session: AuthSession) => {
    setAuthError("");
    setAuthSession(session);
    setShowAuthPage(false);
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    applyPendingLandingUrl();
  };

  const signOut = () => {
    setAuthSession(null);
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    streamRef.current?.close();
    streamRef.current = null;
  };

  const openAuth = (mode: typeof authMode) => {
    setAuthMode(mode);
    setShowAuthPage(true);
  };

  const startFromLandingUrl = (nextTargetUrl: string) => {
    const nextUrlError = validateTargetUrl(nextTargetUrl);
    setTargetUrl(nextTargetUrl);
    setUrlError(nextUrlError);
    setGlobalFilters((current) => ({
      ...current,
      website: toWebsiteName(nextTargetUrl) || current.website,
    }));
    window.localStorage.setItem(PENDING_LANDING_URL_KEY, nextTargetUrl);
    setHasLandingIntent(true);
    setAuthMode("register");
    setShowAuthPage(true);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = "light";

    const restoreState = async () => {
      const storedProjects = window.localStorage.getItem(SAVED_PROJECTS_KEY);
      if (storedProjects) {
        try {
          setSavedProjects(JSON.parse(storedProjects) as SavedProject[]);
        } catch {
          window.localStorage.removeItem(SAVED_PROJECTS_KEY);
        }
      }

      let restoredRunId: string | null = null;
      let restoredTargetUrl = "";
      const storedState = window.localStorage.getItem(APP_STATE_KEY);
      if (storedState) {
        try {
          const parsed = JSON.parse(storedState) as {
            targetUrl?: string;
            repoUrl?: string;
            uploadedPath?: string;
            analysisOptions?: AnalysisOptions;
            activeView?: AppView;
            globalFilters?: GlobalFilters;
            selectedRunId?: string | null;
          };

          setTargetUrl(parsed.targetUrl ?? "");
          restoredTargetUrl = parsed.targetUrl ?? "";
          setRepoUrl(parsed.repoUrl ?? "");
          setUploadedPath(parsed.uploadedPath ?? "");
          const defaultOptions = createDefaultAnalysisOptions();
          setAnalysisOptions({
            ...defaultOptions,
            ...(parsed.analysisOptions ?? {}),
            loginPrompt: {
              checkpointLabel: defaultOptions.loginPrompt?.checkpointLabel,
              timeoutSeconds: defaultOptions.loginPrompt?.timeoutSeconds,
              autoContinueWithoutLogin: defaultOptions.loginPrompt?.autoContinueWithoutLogin,
              ...(parsed.analysisOptions?.loginPrompt ?? {}),
              enabled:
                parsed.analysisOptions?.loginPrompt?.enabled ??
                defaultOptions.loginPrompt?.enabled ??
                DEFAULT_ANALYSIS_OPTIONS.loginPromptEnabled,
            },
          });
          setActiveView(parsed.activeView ?? "overview");
          setGlobalFilters(
            parsed.globalFilters ?? {
              website: defaultWebsiteFilter([], parsed.targetUrl ?? ""),
              route: "all",
              status: "all",
              severity: "all",
              issueType: "all",
            },
          );
          restoredRunId = parsed.selectedRunId ?? null;
        } catch {
          window.localStorage.removeItem(APP_STATE_KEY);
        }
      }

      await fetchHistory(restoredTargetUrl);

      if (restoredRunId) {
        try {
          const fullRun = await fetchRun(restoredRunId);
          setCurrentRun(fullRun);
          if (fullRun.result) {
            setResult(fullRun.result);
          }
        } catch {
          // Ignore stale selection.
        }
      }

      setRestored(true);
    };

    void restoreState();

    return () => streamRef.current?.close();
  }, [fetchHistory, fetchRun]);

  useEffect(() => {
    window.localStorage.setItem(SAVED_PROJECTS_KEY, JSON.stringify(savedProjects));
  }, [savedProjects]);

  useEffect(() => {
    if (!authSession?.email) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    const encodedEmail = encodeURIComponent(authSession.email);

    const loadNotifications = async () => {
      try {
        const response = await fetch(`${NOTIFICATIONS_API_BASE_URL}?email=${encodedEmail}`);
        const nextNotifications = (await response.json()) as AppNotification[];
        if (response.ok && !cancelled) {
          setNotifications(nextNotifications);
        }
      } catch {
        // Keep the current notification list.
      }
    };

    void loadNotifications();

    const stream = new EventSource(`${NOTIFICATIONS_API_BASE_URL}/stream?email=${encodedEmail}`);
    stream.onmessage = (event) => {
      const notification = JSON.parse(event.data) as AppNotification;
      setNotifications((current) => [
        notification,
        ...current.filter((item) => item.notificationId !== notification.notificationId),
      ].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()));
    };
    stream.onerror = () => {
      stream.close();
    };

    return () => {
      cancelled = true;
      stream.close();
    };
  }, [authSession?.email]);

  useEffect(() => {
    if (!restored) {
      return;
    }

    window.localStorage.setItem(
      APP_STATE_KEY,
      JSON.stringify({
        targetUrl,
        repoUrl,
        uploadedPath,
        analysisOptions,
        activeView,
        globalFilters,
        selectedRunId: currentRun?.runId ?? null,
      }),
    );
  }, [
    activeView,
    analysisOptions,
    currentRun?.runId,
    globalFilters,
    repoUrl,
    restored,
    targetUrl,
    uploadedPath,
  ]);

  useEffect(() => {
    streamRef.current?.close();
    streamRef.current = null;

    const currentRunId = currentRun?.runId;
    const currentRunStatus = currentRun?.status;

    if (!currentRunId || !currentRunStatus || !["queued", "running", "awaiting_checkpoint"].includes(currentRunStatus)) {
      return;
    }

    const stream = new EventSource(`${ANALYSIS_API_BASE_URL}/runs/${currentRunId}/stream`);
    streamRef.current = stream;

    stream.onmessage = (event) => {
      const nextRun = JSON.parse(event.data) as AnalysisRun;
      setCurrentRun((previous) => {
        const mergedRun = mergeRunSnapshot(previous, nextRun);
        setHistoryRuns((runs) => [mergedRun, ...runs.filter((item) => item.runId !== mergedRun.runId)]);
        if (mergedRun.result) {
          setResult(mergedRun.result);
        }
        if (mergedRun.status === "completed" || mergedRun.status === "failed") {
          setLoading(false);
          stream.close();
        }
        return mergedRun;
      });
    };

    stream.onerror = () => {
      stream.close();
      streamRef.current = null;
    };

    return () => stream.close();
  }, [currentRun?.runId, currentRun?.status]);

  const validateTargetUrl = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Target website URL is required.";
    }

    try {
      const parsed = new URL(trimmed);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return "Use an http or https website URL.";
      }
      return "";
    } catch {
      return "Enter a valid website URL, for example https://example.com.";
    }
  };

  const updateSavedProject = (project: SavedProject) => {
    setSavedProjects((current) => [
      project,
      ...current.filter((item) => item.id !== project.id),
    ]);
  };

  const saveCurrentProject = (pinned: boolean) => {
    if (!targetUrl.trim()) {
      return;
    }

    const existing =
      savedProjects.find((item) => item.targetUrl === targetUrl.trim()) ??
      savedProjects.find((item) => item.name === toProjectName(targetUrl));

    updateSavedProject({
      id: existing?.id ?? crypto.randomUUID(),
      name: existing?.name ?? toProjectName(targetUrl),
      targetUrl: targetUrl.trim(),
      repoUrl: repoUrl.trim(),
      uploadedPath: uploadedPath.trim(),
      pinned: pinned || existing?.pinned || false,
      lastUsedAt: new Date().toISOString(),
    });
  };

  const retryRun = async (runId: string) => {
    setLoading(true);
    const response = await fetch(`${ANALYSIS_API_BASE_URL}/runs/${runId}/retry`, {
      method: "POST",
    });
    const nextRun = (await response.json()) as AnalysisRun & { error?: string };
    if (!response.ok) {
      setLoading(false);
      throw new Error(nextRun.error ?? "Retry failed");
    }

    setCurrentRun(nextRun);
    setHistoryRuns((runs) => [nextRun, ...runs.filter((item) => item.runId !== nextRun.runId)]);
    setGlobalFilters((current) => ({ ...current, website: toWebsiteName(nextRun.request.targetUrl) || current.website }));
    setActiveView("run");
  };

  const replaceCurrentRun = (nextRun: AnalysisRun) => {
    setCurrentRun(nextRun);
    setHistoryRuns((runs) => [nextRun, ...runs.filter((item) => item.runId !== nextRun.runId)]);
    setGlobalFilters((current) => ({ ...current, website: toWebsiteName(nextRun.request.targetUrl) || current.website }));
    setActiveView("run");
    setLoading(["queued", "running", "awaiting_checkpoint"].includes(nextRun.status));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextUrlError = validateTargetUrl(targetUrl);
    setUrlError(nextUrlError);
    if (nextUrlError) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    saveCurrentProject(false);

    const payload: AnalysisSubmission = {
      targetUrl,
      operator: authSession
        ? {
            email: authSession.email,
            name: authSession.name,
          }
        : undefined,
      backend: {
        githubRepoUrl: repoUrl || undefined,
        uploadedPath: uploadedPath || undefined,
      },
      options: {
        maxPages: analysisOptions.maxPages,
        maxLinksPerPage: analysisOptions.maxLinksPerPage,
        maxDepth: analysisOptions.maxDepth,
        maxInteractionsPerPage: analysisOptions.maxInteractionsPerPage,
        domainAllowlist: analysisOptions.domainAllowlist,
        excludePathPatterns: analysisOptions.excludePathPatterns,
        respectRobotsTxt: analysisOptions.respectRobotsTxt,
        streamHtmlPreview: analysisOptions.streamHtmlPreview,
        crawlProfile: analysisOptions.crawlProfile,
        strictBehaviorMode: analysisOptions.strictBehaviorMode,
        promptForLogin: analysisOptions.promptForLogin,
        loginPrompt: {
          ...analysisOptions.loginPrompt,
          enabled: analysisOptions.loginPrompt?.enabled ?? DEFAULT_ANALYSIS_OPTIONS.loginPromptEnabled,
          checkpointLabel: analysisOptions.loginPrompt?.checkpointLabel ?? DEFAULT_ANALYSIS_OPTIONS.loginPromptLabel,
          timeoutSeconds:
            analysisOptions.loginPrompt?.timeoutSeconds ?? DEFAULT_ANALYSIS_OPTIONS.loginPromptTimeoutSeconds,
        },
      },
    };

    try {
      const response = await fetch(`${ANALYSIS_API_BASE_URL}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const nextRun = (await response.json()) as AnalysisRun & { error?: string };
      if (!response.ok) {
        throw new Error(nextRun.error ?? "Analysis failed");
      }

      setCurrentRun(nextRun);
      setHistoryRuns((runs) => [nextRun, ...runs.filter((item) => item.runId !== nextRun.runId)]);
      setGlobalFilters((current) => ({ ...current, website: toWebsiteName(nextRun.request.targetUrl) || current.website }));
      setActiveView("run");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Analysis failed");
      setCurrentRun(null);
      setLoading(false);
    }
  };

  const renderActiveView = () => {
    switch (activeView) {
      case "overview":
        return <OverviewView result={filteredResult} />;
      case "run":
        return (
          <RunView
            targetUrl={targetUrl}
            repoUrl={repoUrl}
            uploadedPath={uploadedPath}
            analysisOptions={analysisOptions}
            loading={loading}
            error={error}
            urlError={urlError}
            currentRun={currentRun}
            savedProjects={savedProjects}
            onRetryRun={retryRun}
            onReplaceRun={replaceCurrentRun}
            onSubmit={onSubmit}
            onTargetUrlChange={(value) => {
              setTargetUrl(value);
              setUrlError(validateTargetUrl(value));
            }}
            onRepoUrlChange={setRepoUrl}
            onUploadedPathChange={setUploadedPath}
            onAnalysisOptionsChange={setAnalysisOptions}
          />
        );
      case "pages":
        return <PagesView result={filteredResult} filters={globalFilters} />;
      case "findings":
        return <FindingsView result={filteredResult} filters={globalFilters} />;
      case "tests":
        return <TestsView result={filteredResult} filters={globalFilters} />;
      case "report":
        return <ReportView result={filteredResult} filters={globalFilters} />;
      case "history":
        return (
          <HistoryView
            filters={globalFilters}
            runs={historyRuns}
            onSelectRun={async (run) => {
              setError("");
              setLoading(true);
              try {
                const fullRun = await fetchRun(run.runId);
                setCurrentRun(fullRun);
                setHistoryRuns((runs) => [fullRun, ...runs.filter((item) => item.runId !== fullRun.runId)]);
                setGlobalFilters((current) => ({
                  ...current,
                  website: toWebsiteName(fullRun.request.targetUrl) || current.website,
                }));
                if (fullRun.result) {
                  setResult(fullRun.result);
                  setActiveView((current) => (current === "history" ? "overview" : current));
                } else {
                  setActiveView((current) => (current === "history" ? "run" : current));
                }
              } catch (selectionError) {
                setError(selectionError instanceof Error ? selectionError.message : "Failed to open run");
              } finally {
                setLoading(false);
              }
            }}
          />
        );
      case "compare":
        return (
          <CompareView
            availableRuns={historyRuns}
            runs={comparisonRuns}
            onCompareRuns={async (runIds) => {
              const runs = await Promise.all(runIds.map((runId) => fetchRun(runId)));
              setComparisonRuns(runs);
            }}
          />
        );
      case "profile":
        return authSession ? (
          <ProfileView
            user={authSession}
            runs={historyRuns}
            savedProjects={savedProjects}
            onSignOut={signOut}
          />
        ) : null;
      default:
        return null;
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    if (!authSession?.email) {
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.notificationId === notificationId
          ? { ...notification, readAt: notification.readAt ?? new Date().toISOString() }
          : notification,
      ),
    );

    try {
      await fetch(`${NOTIFICATIONS_API_BASE_URL}/${notificationId}/read`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: authSession.email }),
      });
    } catch {
      // The next notification refresh will reconcile state.
    }
  };

  const markAllNotificationsRead = async () => {
    if (!authSession?.email) {
      return;
    }

    const readAt = new Date().toISOString();
    setNotifications((current) => current.map((notification) => ({ ...notification, readAt: notification.readAt ?? readAt })));

    try {
      await fetch(`${NOTIFICATIONS_API_BASE_URL}/read-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: authSession.email }),
      });
    } catch {
      // The next notification refresh will reconcile state.
    }
  };

  const applyPendingLandingUrl = () => {
    const pendingUrl = window.localStorage.getItem(PENDING_LANDING_URL_KEY);
    if (!pendingUrl && !hasLandingIntent) {
      return;
    }

    const nextTargetUrl = pendingUrl || targetUrl;
    const nextUrlError = validateTargetUrl(nextTargetUrl);
    if (!nextUrlError) {
      setTargetUrl(nextTargetUrl);
      setUrlError("");
      setActiveView("run");
      setGlobalFilters((current) => ({
        ...current,
        website: toWebsiteName(nextTargetUrl) || current.website,
      }));
    }

    setHasLandingIntent(false);
    window.localStorage.removeItem(PENDING_LANDING_URL_KEY);
  };

  if (!authSession) {
    return showAuthPage || authError ? (
      <AuthPage
        key={authMode}
        initialMode={authMode}
        error={authError}
        onAuthenticated={authenticate}
        onBackToLanding={() => {
          setAuthError("");
          setShowAuthPage(false);
        }}
      />
    ) : (
      <LandingPage onOpenAuth={openAuth} onTryWebsite={startFromLandingUrl} />
    );
  }

  return (
    <main className="dashboard-shell min-h-screen overflow-x-hidden text-slate-100">
      <GlobalFilterModal
        open={filterModalOpen}
        filters={globalFilters}
        onChange={setGlobalFilters}
        onClose={() => setFilterModalOpen(false)}
        result={filteredResult}
        currentRun={filteredCurrentRun}
      />
      <MobileNavigationDrawer
        activeView={activeView}
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onViewChange={setActiveView}
      />

      <div className="dashboard-container mx-auto w-full max-w-[1600px] px-4 py-4 pb-24 sm:px-6 md:pb-6">
        <div className="grid min-w-0 gap-4">
          <header className="mobile-topbar app-navbar-shell glass-surface rounded-[1.15rem] px-3 py-3 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="control-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] text-sm font-bold text-cyan-200"
                aria-label="Open navigation"
              >
                SK
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] uppercase tracking-[0.18em] text-cyan-300">SK CrawlPulse</p>
                <p className="mt-0.5 truncate text-sm font-semibold text-white">{activeView}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="control-surface rounded-full px-3 py-2 text-xs font-semibold text-slate-300"
              >
                Menu
              </button>
            </div>
          </header>

          <TopBar
            user={authSession}
            notifications={notifications}
            unreadCount={unreadNotifications}
            onMarkNotificationRead={markNotificationRead}
            onMarkAllNotificationsRead={markAllNotificationsRead}
            onSignOut={signOut}
          />

          <div className="workspace-layout grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
            <ViewTabs
              activeView={activeView}
              onViewChange={setActiveView}
              websiteOptions={websiteOptions}
              selectedWebsite={globalFilters.website}
              onWebsiteChange={(website) => setGlobalFilters((current) => ({ ...current, website }))}
            />

            <div className="workspace-stage grid min-w-0 gap-4">
              {activeView !== "run" ? (
                <TopStatusStrip
                  activeView={activeView}
                  currentRun={filteredCurrentRun}
                  result={filteredResult}
                  onOpenFilters={activeView === "overview" ? () => setFilterModalOpen(true) : undefined}
                  hasActiveFilters={hasActiveFilters}
                />
              ) : null}

              <section className="workspace-content-stage min-w-0 overflow-x-hidden">{renderActiveView()}</section>
            </div>
          </div>
        </div>
      </div>

      <MobileActionBar
        canRetry={currentRun?.status === "failed"}
        canCompare={historyRuns.length >= 2}
        canSave={Boolean(targetUrl.trim())}
        onRun={() => setActiveView("run")}
        onRetry={() => {
          if (currentRun?.status === "failed") {
            void retryRun(currentRun.runId);
          }
        }}
        onCompare={() => setActiveView("compare")}
        onSave={() => saveCurrentProject(true)}
        onProfile={() => setActiveView("profile")}
      />
    </main>
  );
}
