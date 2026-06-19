import { useState } from "react";
import { runtime } from "../config/runtime";
import type { AnalysisRun, SavedProject } from "../types/analysis";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  mode?: string;
  sources?: string[];
};

type AssistantPanelProps = {
  run: AnalysisRun | null;
  historyRuns: AnalysisRun[];
  savedProjects: SavedProject[];
  userEmail: string;
};

export function AssistantPanel({ run, historyRuns, savedProjects, userEmail }: AssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Ask about this project, run history, findings, pages, logs, generated tests, coverage, security, or what to fix first.",
      mode: "rule-based",
      sources: [],
    },
  ]);

  const canAsk = Boolean(run?.runId || historyRuns.length || savedProjects.length);
  const currentCoverage = run?.result?.frontend.coverageScore;
  const currentIssues = run?.result?.frontend.runtimeFindings.length ?? 0;
  const currentSecurity = run?.result?.frontend.securityFindings.length ?? 0;
  const currentDevices = currentCoverage?.mobileDevicesTested ?? [];
  const quickPrompts = [
    "What is the project status?",
    "What are the critical issues?",
    "What should be fixed first?",
    "Which pages and logs matter?",
  ];

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || !canAsk) {
      return;
    }

    setQuestion("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);

    try {
      if (!run?.runId || shouldAnswerFromProject(trimmed)) {
        setMessages((current) => [...current, answerProjectQuestion(trimmed, run, historyRuns, savedProjects)]);
        return;
      }

      const response = await fetch(
        `${runtime.apiBaseUrl}${runtime.analysisApiPath}/runs/${run.runId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: trimmed, email: userEmail }),
        },
      );
      const payload = (await response.json().catch(() => null)) as
        | { answer?: string; mode?: string; sources?: string[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Assistant request failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload?.answer ?? "No answer was produced.",
          mode: payload?.mode,
          sources: payload?.sources,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        answerProjectQuestion(
          trimmed,
          run,
          historyRuns,
          savedProjects,
          error instanceof Error ? error.message : "Assistant request failed",
        ),
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className={`fixed z-40 ${open ? "bottom-3 right-3 w-[calc(100vw-1.5rem)] sm:bottom-5 sm:right-5 sm:w-[min(92vw,430px)]" : "bottom-4 right-4 sm:bottom-5 sm:right-5"}`}>
      {open ? (
        <section className="assistant-panel flex max-h-[min(82vh,680px)] min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-cyan-900/10 bg-[#F5FAFD] shadow-[0_28px_70px_rgba(15,23,42,0.22)]">
          <header className="shrink-0 bg-[#081225] px-4 py-4 text-white">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.26em] text-cyan-200">CrawlPulse AI</p>
                <h2 className="mt-1 truncate text-lg font-bold leading-6 text-white">Project Assistant</h2>
                <p className="mt-1 truncate text-sm text-slate-300">Ask about runs, findings, pages, logs, tests, reports, and security.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg leading-none text-slate-200 transition hover:bg-white/10"
                  aria-label="Minimize assistant"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg leading-none text-slate-200 transition hover:bg-white/10"
                  aria-label="Close assistant"
                >
                  x
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              <AssistantStat label="Findings" value={String(currentIssues)} />
              <AssistantStat label="Security" value={String(currentSecurity)} />
              <AssistantStat label="Devices" value={String(currentDevices.length)} />
              <AssistantStat label="Coverage" value={currentCoverage ? `${currentCoverage.overallScore}` : "--"} />
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <section className="rounded-[1.25rem] border border-cyan-900/10 bg-white p-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-700">Suggested prompts</p>
                <p className="text-xs text-slate-400">Tap to send</p>
              </div>
              <div className="mt-3 grid gap-2">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setQuestion(prompt);
                      window.setTimeout(() => void askPrompt(prompt), 0);
                    }}
                    className="min-h-11 rounded-[0.95rem] border border-slate-200 bg-white px-4 py-2 text-left text-sm font-semibold leading-5 text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-3 grid gap-3">
              {messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`max-w-full rounded-[1rem] px-3 py-3 text-sm shadow-sm ${
                    message.role === "user"
                      ? "ml-8 bg-[#0F172A] text-white"
                      : "mr-8 border border-cyan-900/10 bg-white text-slate-800"
                  }`}
                >
                  <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${message.role === "user" ? "text-cyan-100" : "text-cyan-700"}`}>
                    {message.role}
                  </p>
                  <p className="mt-1 break-words leading-6">{message.text}</p>
                  {message.mode || message.sources?.length ? (
                    <div className="mt-2 flex max-w-full flex-wrap gap-1.5">
                      {message.mode ? (
                        <span className="rounded-full border border-cyan-900/10 bg-cyan-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-slate-600">
                          {message.mode}
                        </span>
                      ) : null}
                      {message.sources?.length ? (
                        <span className="max-w-full truncate rounded-full border border-cyan-900/10 bg-slate-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-slate-600">
                          {message.sources.join(", ")}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          </div>

          <form
            className="shrink-0 border-t border-cyan-900/10 bg-white/95 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask();
            }}
          >
            <div className="flex min-w-0 items-end gap-2 rounded-[1.15rem] border border-slate-200 bg-white p-2 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={1}
                placeholder="Ask anything about this project..."
                disabled={!canAsk || loading}
                className="max-h-24 min-h-10 min-w-0 flex-1 resize-none rounded-[0.9rem] border-0 bg-slate-50 px-3 py-2.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={!canAsk || loading || question.trim().length === 0}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[0.95rem] bg-[#081225] text-lg font-bold text-white shadow-[0_14px_30px_rgba(8,18,37,0.24)] transition hover:bg-[#10203E] disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Send assistant question"
              >
                {loading ? "..." : ">"}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#15616D,#3155E7)] text-white shadow-[0_18px_40px_rgba(49,85,231,0.34)]"
          aria-label="Open assistant"
        >
          <span className="relative h-7 w-8" aria-hidden="true">
            <span className="absolute inset-x-0 top-0 h-6 rounded-[0.75rem] border-2 border-white" />
            <span className="absolute bottom-0 left-2 h-2.5 w-2.5 rotate-45 border-b-2 border-r-2 border-white" />
            <span className="absolute left-2 top-2.5 h-1 w-1 rounded-full bg-white" />
            <span className="absolute left-3.5 top-2.5 h-1 w-1 rounded-full bg-white" />
            <span className="absolute left-5 top-2.5 h-1 w-1 rounded-full bg-white" />
          </span>
        </button>
      )}
    </aside>
  );

  async function askPrompt(prompt: string) {
    const previousQuestion = question;
    setQuestion(prompt);
    await askWithText(prompt);
    setQuestion(previousQuestion);
  }

  async function askWithText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !canAsk) {
      return;
    }

    setLoading(true);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);

    try {
      if (!run?.runId || shouldAnswerFromProject(trimmed)) {
        setMessages((current) => [...current, answerProjectQuestion(trimmed, run, historyRuns, savedProjects)]);
        return;
      }

      const response = await fetch(`${runtime.apiBaseUrl}${runtime.analysisApiPath}/runs/${run.runId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: trimmed, email: userEmail }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { answer?: string; mode?: string; sources?: string[]; error?: string }
        | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Assistant request failed");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: payload?.answer ?? "No answer was produced.",
          mode: payload?.mode,
          sources: payload?.sources,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        answerProjectQuestion(
          trimmed,
          run,
          historyRuns,
          savedProjects,
          error instanceof Error ? error.message : "Assistant request failed",
        ),
      ]);
    } finally {
      setLoading(false);
      setQuestion("");
    }
  }
}

function AssistantStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[0.75rem] border border-white/10 bg-white/5 px-2 py-2">
      <p className="truncate text-[9px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function shouldAnswerFromProject(question: string) {
  return /\b(project|history|saved|profile|overall|all runs|previous|latest|workspace)\b/i.test(question);
}

function answerProjectQuestion(
  question: string,
  run: AnalysisRun | null,
  historyRuns: AnalysisRun[],
  savedProjects: SavedProject[],
  fallbackError?: string,
): ChatMessage {
  const normalized = question.toLowerCase();
  const runs = [run, ...historyRuns].filter((item, index, items): item is AnalysisRun =>
    Boolean(item) && items.findIndex((candidate) => candidate?.runId === item?.runId) === index,
  );
  const completedRuns = runs.filter((item) => item.status === "completed");
  const failedRuns = runs.filter((item) => item.status === "failed");
  const findings = runs.flatMap((item) => item.result?.frontend.runtimeFindings ?? []);
  const security = runs.flatMap((item) => item.result?.frontend.securityFindings ?? []);
  const failedInteractions = runs.flatMap((item) => item.result?.frontend.interactionResults.filter((interaction) => interaction.result === "FAIL") ?? []);
  const latestRun = run ?? runs[0] ?? null;

  if (/\b(critical|severe|high|priority|fix first|first)\b/.test(normalized)) {
    const topFindings = findings
      .slice()
      .sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity))
      .slice(0, 5)
      .map((finding) => `${finding.severity.toUpperCase()}: ${finding.summary} (${finding.pageUrl})`);
    return {
      role: "assistant",
      text: topFindings.length
        ? `Across the loaded project data, fix these first: ${topFindings.join(" | ")}`
        : `No high-priority findings are available in the loaded project data. ${fallbackError ? `Backend assistant fallback: ${fallbackError}` : ""}`.trim(),
      mode: "project-data",
      sources: ["historyRuns", "runtimeFindings"],
    };
  }

  if (/\b(saved|project|workspace|history|overall|status|summary)\b/.test(normalized)) {
    return {
      role: "assistant",
      text: `Loaded workspace data: ${runs.length} run(s), ${completedRuns.length} completed, ${failedRuns.length} failed, ${savedProjects.length} saved project(s), ${findings.length} finding(s), ${security.length} API security signal(s). Latest run: ${latestRun ? `${latestRun.status} for ${latestRun.request.targetUrl}` : "none selected"}.`,
      mode: "project-data",
      sources: ["historyRuns", "savedProjects", "currentRun"],
    };
  }

  if (/\b(page|route|log|interaction|fail|error)\b/.test(normalized)) {
    const latestLogs = (latestRun?.logs ?? []).slice(-5).map((log) => `${log.level}:${log.scope} ${log.message}`);
    const failed = failedInteractions.slice(0, 5).map((interaction) => `${interaction.text || interaction.selector} on ${interaction.pageUrl}`);
    return {
      role: "assistant",
      text: `From the loaded data: ${latestRun?.pages.length ?? 0} page snapshot(s), ${latestRun?.interactions.length ?? 0} interaction(s), and ${latestLogs.length} recent log line(s). Failed interactions: ${failed.join(" | ") || "none loaded"}. Recent logs: ${latestLogs.join(" | ") || "none loaded"}.`,
      mode: "project-data",
      sources: ["pages", "interactions", "logs"],
    };
  }

  return {
    role: "assistant",
    text: `I used the loaded project data. Current run: ${latestRun ? `${latestRun.status} on ${latestRun.request.targetUrl}` : "not selected"}. Findings: ${findings.length}. Security signals: ${security.length}. Saved projects: ${savedProjects.length}.${fallbackError ? ` Backend assistant fallback: ${fallbackError}` : ""}`,
    mode: "project-data",
    sources: ["currentRun", "historyRuns", "savedProjects"],
  };
}

function severityWeight(value: "low" | "medium" | "high") {
  return value === "high" ? 3 : value === "medium" ? 2 : 1;
}
