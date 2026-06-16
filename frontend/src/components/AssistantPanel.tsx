import { useState } from "react";
import { runtime } from "../config/runtime";
import type { AnalysisRun } from "../types/analysis";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  mode?: string;
  sources?: string[];
};

type AssistantPanelProps = {
  run: AnalysisRun | null;
};

export function AssistantPanel({ run }: AssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      text: "Ask about login failure, critical issues, coverage, API behavior, or what to fix first.",
      mode: "rule-based",
      sources: [],
    },
  ]);

  const canAsk = Boolean(run?.runId);
  const currentCoverage = run?.result?.frontend.coverageScore;
  const currentIssues = run?.result?.frontend.runtimeFindings.length ?? 0;
  const currentSecurity = run?.result?.frontend.securityFindings.length ?? 0;
  const currentDevices = currentCoverage?.mobileDevicesTested ?? [];
  const quickPrompts = [
    "Why did login fail?",
    "What are the critical issues?",
    "What should be fixed first?",
    "Summarize API security risks.",
  ];

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || !run?.runId) {
      return;
    }

    setQuestion("");
    setLoading(true);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);

    try {
      const response = await fetch(
        `${runtime.apiBaseUrl}${runtime.analysisApiPath}/runs/${run.runId}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question: trimmed }),
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
        {
          role: "assistant",
          text: error instanceof Error ? error.message : "Assistant request failed",
          mode: "rule-based",
          sources: ["assistant"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed bottom-20 right-4 z-40 w-[min(92vw,440px)]">
      <div className="overflow-hidden rounded-[1.4rem] border border-cyan-300/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,253,255,0.96)_52%,rgba(238,248,251,0.96)_100%)] shadow-[0_20px_55px_rgba(15,23,42,0.12)] backdrop-blur-xl">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 border-b border-cyan-900/10 px-4 py-3.5 text-left"
          onClick={() => setOpen((value) => !value)}
        >
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-700">Assistant</p>
            <p className="truncate text-sm font-semibold text-slate-900">Run-aware helper</p>
          </div>
          <span className="rounded-full border border-cyan-900/10 bg-white px-2.5 py-1 text-[11px] text-slate-600 shadow-sm">
            {open ? "Hide" : "Show"}
          </span>
        </button>

        {open ? (
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Findings" value={String(currentIssues)} />
              <MiniStat label="Security" value={String(currentSecurity)} />
              <MiniStat label="Devices" value={String(currentDevices.length)} />
              <MiniStat label="Coverage" value={currentCoverage ? `${currentCoverage.overallScore}/100` : "--"} />
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuestion(prompt)}
                  className="rounded-full border border-cyan-700/15 bg-cyan-50 px-3 py-1.5 text-[11px] text-cyan-900 transition hover:bg-cyan-100"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="max-h-64 overflow-auto rounded-2xl border border-cyan-900/10 bg-white p-3 text-sm text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className="mb-3 last:mb-0">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-cyan-700/80">{message.role}</p>
                  <p className="mt-1 leading-6 text-slate-900">{message.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.mode ? <span className="rounded-full border border-cyan-900/10 bg-cyan-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-600">{message.mode}</span> : null}
                    {message.sources?.length ? <span className="rounded-full border border-cyan-900/10 bg-slate-50 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-slate-600">{message.sources.join(", ")}</span> : null}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                rows={3}
                placeholder='Ask "Why did login fail?"'
                disabled={!canAsk || loading}
                className="w-full rounded-2xl border border-cyan-900/10 bg-white px-3 py-3 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400 focus:border-cyan-400"
              />
              <button
                type="button"
                onClick={() => void ask()}
                disabled={!canAsk || loading || question.trim().length === 0}
                className="rounded-2xl bg-[linear-gradient(135deg,rgba(21,97,109,0.98)_0%,rgba(38,198,218,0.98)_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(21,97,109,0.18)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Ask"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-cyan-900/10 bg-slate-50 px-3 py-2 shadow-sm">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
