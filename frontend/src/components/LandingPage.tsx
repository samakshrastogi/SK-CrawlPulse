import heroImage from "../assets/hero.png";
import type { AuthMode } from "./AuthPage";

type LandingPageProps = {
  onOpenAuth: (mode: AuthMode) => void;
};

const valueCards = [
  {
    title: "Autonomous crawl coverage",
    body: "Discover routes, forms, links, buttons, inputs, and page previews without manually walking every screen.",
  },
  {
    title: "Runtime issue evidence",
    body: "Capture failed requests, JavaScript exceptions, accessibility risks, visual overflow, boundary signals, and screenshots.",
  },
  {
    title: "Review-ready output",
    body: "Package findings into reports, triage states, run comparisons, quality gates, and Playwright starter specs.",
  },
];

const workflowItems = [
  "Submit a target URL with optional backend context.",
  "Monitor live crawl progress, route previews, logs, and login checkpoints.",
  "Review discovered pages, generated tests, findings, reports, and historical deltas.",
  "Export evidence or convert generated cases into regression coverage.",
];

const metricCards = [
  ["Live analysis", "Crawl progress, previews, and logs"],
  ["Actionable findings", "Severity, evidence, owner hints"],
  ["Handoff ready", "HTML, JSON, and Playwright export"],
];

const audienceCards = [
  ["QA teams", "Reduce repetitive exploratory passes and focus manual review on high-risk journeys."],
  ["Developers", "Reproduce frontend, API, and runtime issues with route-specific evidence."],
  ["Reviewers", "Compare runs and decide whether quality is improving before a release."],
];

export function LandingPage({ onOpenAuth }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#F7FAFC_0%,#EEF8FB_48%,#FFFFFF_100%)] text-slate-950">
      <section className="border-b border-cyan-900/10 bg-white/80 backdrop-blur">
        <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[linear-gradient(135deg,#15616D,#26C6DA)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(21,97,109,0.22)]">
              SK
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-800">SK CrawlPulse</p>
              <p className="truncate text-xs text-slate-500">Autonomous web QA workspace</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="min-h-[42px] rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("register")}
              className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-full bg-[#15616D] px-4 py-2 text-sm font-bold text-white shadow-[0_12px_26px_rgba(21,97,109,0.2)] transition hover:bg-[#0F4F59]"
            >
              Create account
            </button>
          </div>
        </header>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-center lg:px-8 lg:py-14">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Quality evidence for modern websites</p>
          <h1 className="mt-4 max-w-4xl text-[2.25rem] font-semibold leading-[1.08] text-slate-950 sm:text-5xl lg:text-6xl">
            Analyze websites like a QA team that never stops watching.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            SK CrawlPulse explores your application, tests interactive behavior, records evidence, and turns live runtime signals into findings, reports, and regression-ready test cases.
          </p>

          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => onOpenAuth("register")}
              className="inline-flex min-h-[48px] min-w-[180px] items-center justify-center whitespace-nowrap rounded-full bg-[#15616D] px-7 py-3 text-base font-bold leading-none text-white shadow-[0_16px_34px_rgba(21,97,109,0.24)] transition hover:bg-[#0F4F59]"
            >
              Start scanning
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="inline-flex min-h-[48px] min-w-[190px] items-center justify-center whitespace-nowrap rounded-full border border-slate-300 bg-white px-7 py-3 text-base font-semibold leading-none text-slate-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              Sign in to workspace
            </button>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {metricCards.map(([label, value]) => (
              <div key={label} className="rounded-[1rem] border border-cyan-900/10 bg-white px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">{label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-cyan-900/10 bg-white p-4 shadow-[0_24px_70px_rgba(15,23,42,0.1)] sm:p-6">
            <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,rgba(38,198,218,0.16),rgba(21,97,109,0.08))]" />
            <div className="relative grid gap-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Run preview</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Evidence captured as the crawl runs</h2>
                </div>
                <img
                  src={heroImage}
                  alt="Layered analysis preview"
                  className="h-24 w-24 shrink-0 object-contain sm:h-32 sm:w-32"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <PreviewMetric label="Routes found" value="24" tone="cyan" />
                <PreviewMetric label="Checks run" value="140" tone="emerald" />
                <PreviewMetric label="Findings grouped" value="9" tone="amber" />
                <PreviewMetric label="Exports ready" value="3" tone="slate" />
              </div>

              <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Latest signal</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Request failure detected on checkout route with screenshot evidence and generated regression case.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-12">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Why use it</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold leading-tight text-slate-950">
            Replace scattered manual checking with one evidence trail.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            Use SK CrawlPulse when you need faster release review, repeatable website validation, clearer defect evidence, and a bridge from exploratory testing to regression coverage.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-1">
          {valueCards.map((card) => (
            <article key={card.title} className="rounded-[1rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_34px_rgba(15,23,42,0.06)]">
              <h3 className="text-base font-semibold text-slate-950">{card.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {audienceCards.map(([title, body]) => (
            <article key={title} className="rounded-[1.1rem] border border-cyan-900/10 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">{title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="rounded-[1.25rem] border border-cyan-900/10 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.07)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">How teams use it</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">From target URL to review-ready output.</h2>
            </div>
            <div className="grid gap-2">
              {workflowItems.map((item, index) => (
                <div key={item} className="flex gap-3 rounded-[0.9rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-700 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="min-h-[46px] rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-cyan-50"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("register")}
              className="inline-flex min-h-[46px] items-center justify-center whitespace-nowrap rounded-full bg-[#15616D] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_26px_rgba(21,97,109,0.2)] transition hover:bg-[#0F4F59]"
            >
              Register now
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

function PreviewMetric({ label, value, tone }: { label: string; value: string; tone: "cyan" | "emerald" | "amber" | "slate" }) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone === "cyan"
          ? "border-cyan-200 bg-cyan-50 text-cyan-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-[0.9rem] border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-semibold leading-none">{value}</p>
    </div>
  );
}
