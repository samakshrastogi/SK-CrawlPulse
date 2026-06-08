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

const footerLinks = [
  {
    title: "Product",
    items: [
      ["Features", "#features"],
      ["Pricing", "#pricing"],
      ["Docs", "#docs"],
    ],
  },
  {
    title: "Use cases",
    items: [
      ["QA teams", "#use-cases"],
      ["Security", "#security"],
      ["FAQ", "#faq"],
    ],
  },
  {
    title: "Resources",
    items: [
      ["Customer proof", "#proof"],
      ["Support", "#docs"],
      ["Status", "#footer-status"],
    ],
  },
];

const proofCards = [
  ["2.4x faster", "Typical release reviews move faster when exploratory passes begin with route evidence and grouped issues."],
  ["9 signals", "Findings can include screenshots, console errors, failed requests, accessibility hints, overflow, routes, forms, inputs, and generated cases."],
  ["3 exports", "Share HTML reports, JSON evidence packages, and Playwright starter specs with the team."],
];

const securityCards = [
  ["Controlled scan scope", "Teams choose the target URL and optional context before each run, so crawl activity stays intentional."],
  ["Local evidence review", "Reports and exports are generated from captured run data, helping reviewers inspect evidence before sharing it onward."],
  ["SSO-ready access", "Google sign-in keeps the entry flow familiar, while password flows support fallback access and account recovery."],
];

const docsCards = [
  ["Start a crawl", "Enter a target URL, choose scan options, and watch progress from the workspace run view."],
  ["Review findings", "Group issues by severity, triage status, route, and evidence so the right owner can act."],
  ["Export handoff", "Download report formats for QA review, developer reproduction, or regression test setup."],
];

const faqItems = [
  ["Can I sign in with Google?", "Yes. The login page includes Continue with Google, and it can use a configured Google client ID when available."],
  ["What can I export?", "Runs can produce HTML reports, JSON evidence packages, and Playwright starter specs."],
  ["Can I reset my password?", "Yes. The auth page includes forgot-password and reset-password flows for account recovery."],
  ["Are crawl limits configurable?", "The scan form already supports crawl configuration options, and limits can be extended as the crawl engine grows."],
];

export function LandingPage({ onOpenAuth }: LandingPageProps) {
  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#F7FAFC_0%,#EEF8FB_48%,#FFFFFF_100%)] text-slate-950">
      <section className="border-b border-cyan-900/10 bg-white/85 backdrop-blur">
        <header className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 md:min-h-[86px] lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[linear-gradient(135deg,#15616D,#26C6DA)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(21,97,109,0.22)]">
              SK
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-800">SK CrawlPulse</p>
              <p className="truncate text-xs text-slate-500">Autonomous web QA workspace</p>
            </div>
          </div>

          <div className="ml-auto grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
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
              className="inline-flex min-h-[42px] items-center justify-center whitespace-nowrap rounded-full border border-cyan-300 bg-[#E8FAFD] px-4 py-2 text-sm font-bold text-cyan-950 shadow-[0_10px_24px_rgba(8,145,178,0.12)] transition hover:border-cyan-400 hover:bg-[#D7F5FA]"
            >
              Create account
            </button>
          </div>
        </header>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-[minmax(0,1fr)_minmax(280px,0.72fr)] md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:px-8 lg:py-14">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Quality evidence for modern websites</p>
          <h1 className="mt-4 max-w-4xl text-[2.15rem] font-semibold leading-[1.08] text-slate-950 sm:text-5xl md:text-[3.35rem] lg:text-6xl">
            Analyze websites like a QA team that never stops watching.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 md:max-w-xl lg:max-w-2xl">
            SK CrawlPulse explores your application, tests interactive behavior, records evidence, and turns live runtime signals into findings, reports, and regression-ready test cases.
          </p>

          <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => onOpenAuth("register")}
              className="inline-flex min-h-[48px] min-w-[180px] items-center justify-center whitespace-nowrap rounded-full border border-cyan-300 bg-[#E8FAFD] px-7 py-3 text-base font-bold leading-none text-cyan-950 shadow-[0_14px_30px_rgba(8,145,178,0.14)] transition hover:border-cyan-400 hover:bg-[#D7F5FA]"
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

          <div className="mt-7 grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
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

      <section id="features" className="mx-auto grid w-full max-w-7xl scroll-mt-24 gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-12">
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

      <section id="use-cases" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {audienceCards.map(([title, body]) => (
            <article key={title} className="rounded-[1.1rem] border border-cyan-900/10 bg-white p-5 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">{title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="proof" className="mx-auto grid w-full max-w-7xl scroll-mt-24 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Customer proof</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">Sample outcomes teams can show after a crawl.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            The page is designed to prove practical value before signup: faster review, clear evidence, and exportable outputs.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {proofCards.map(([value, body]) => (
              <article key={value} className="rounded-[1rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                <p className="text-2xl font-semibold text-slate-950">{value}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[1.25rem] border border-cyan-900/10 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">Sample report</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-950">Checkout crawl evidence</h3>
            </div>
            <img src={heroImage} alt="Report preview layers" className="h-20 w-20 shrink-0 object-contain" />
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ["High", "Failed request on checkout submit", "Screenshot and route log attached"],
              ["Medium", "Overflow in mobile navigation", "Viewport evidence captured"],
              ["Low", "Missing label on search input", "Accessibility hint generated"],
            ].map(([severity, title, detail]) => (
              <div key={title} className="grid gap-2 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 sm:grid-cols-[90px_1fr] sm:items-center">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">{severity}</span>
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="block text-sm leading-6 text-slate-600">{detail}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 rounded-[1.25rem] border border-cyan-900/10 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.07)] md:grid-cols-[0.85fr_1.15fr] sm:p-6">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Pricing</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">Start with a focused trial workspace.</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Keep the offer simple before signup: let teams validate a real website, review findings, and export one handoff package.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Free trial", "1 workspace", "Run a crawl and inspect generated evidence."],
              ["Team", "Shared review", "Add triage, history, comparisons, and reusable exports."],
              ["Enterprise", "Governed QA", "Add SSO policy, retention controls, and audit-focused reporting."],
            ].map(([name, label, body]) => (
              <article key={name} className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-4">
                <p className="text-base font-semibold text-slate-950">{name}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">{label}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Security and trust</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">Clear controls for scan privacy and evidence handling.</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {securityCards.map(([title, body]) => (
              <article key={title} className="rounded-[1rem] border border-cyan-900/10 bg-white px-5 py-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                <h3 className="text-base font-semibold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="docs" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[1.25rem] border border-cyan-900/10 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.07)] sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.7fr_1fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">Docs</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">From target URL to review-ready output.</h2>
              <div className="mt-5 grid gap-3">
                {docsCards.map(([title, body]) => (
                  <div key={title} className="rounded-[0.9rem] border border-cyan-900/10 bg-cyan-50/60 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-950">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                  </div>
                ))}
              </div>
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
              className="inline-flex min-h-[46px] items-center justify-center whitespace-nowrap rounded-full border border-cyan-300 bg-[#E8FAFD] px-6 py-3 text-sm font-bold text-cyan-950 shadow-sm transition hover:border-cyan-400 hover:bg-[#D7F5FA]"
            >
              Register now
            </button>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-10 pt-8 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.24em] text-cyan-700">FAQ</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">Answers before users create an account.</h2>
          </div>
          <div className="grid gap-3">
            {faqItems.map(([question, answer]) => (
              <article key={question} className="rounded-[1rem] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
                <h3 className="text-base font-semibold text-slate-950">{question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-cyan-900/10 bg-white/90">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.1fr_1.4fr] lg:px-8">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] bg-[linear-gradient(135deg,#15616D,#26C6DA)] text-sm font-bold text-white shadow-[0_10px_24px_rgba(21,97,109,0.18)]">
                SK
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-800">SK CrawlPulse</p>
                <p className="text-xs text-slate-500">Autonomous web QA workspace</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-600">
              Crawl, validate, triage, and export website quality evidence from one focused workspace.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">{group.title}</p>
                <div className="mt-3 grid gap-2">
                  {group.items.map(([item, href]) => (
                    <a key={item} href={href} className="text-sm text-slate-600 transition hover:text-cyan-800">
                      {item}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200/80">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
            <span>© 2026 SK CrawlPulse. All rights reserved.</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <span>Privacy</span>
              <span>Terms</span>
              <span id="footer-status">Status</span>
            </div>
          </div>
        </div>
      </footer>
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
