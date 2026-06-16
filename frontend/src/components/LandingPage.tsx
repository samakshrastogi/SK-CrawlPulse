import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import heroImage from "../assets/hero.png";
import { LandingScene } from "./LandingScene";
import type { AuthMode } from "./AuthPage";
import { useLandingAnimations } from "../hooks/useLandingAnimations";

type LandingPageProps = {
  onOpenAuth: (mode: AuthMode) => void;
  onTryWebsite: (targetUrl: string) => void;
};

const DEMO_TARGET_URL = "https://shop.example.com";

const scanModes = [
  {
    id: "crawl",
    label: "Crawl",
    title: "Live crawl map",
    metric: "24",
    metricLabel: "routes",
    detail: "Routes, forms, buttons, and links appear as the crawler explores the site.",
    rows: ["Homepage loaded", "Pricing route mapped", "Checkout form detected"],
  },
  {
    id: "issues",
    label: "Issues",
    title: "Evidence board",
    metric: "9",
    metricLabel: "findings",
    detail: "Runtime failures are grouped with screenshots, request traces, and severity.",
    rows: ["500 response captured", "Mobile overflow found", "Missing input label"],
  },
  {
    id: "tests",
    label: "Tests",
    title: "Generated cases",
    metric: "36",
    metricLabel: "checks",
    detail: "The run turns observed behavior into QA handoff notes and starter specs.",
    rows: ["Login smoke case", "Search boundary case", "Checkout regression case"],
  },
] as const;

const launchSteps = [
  ["01", "Paste URL"],
  ["02", "Review live evidence"],
  ["03", "Export tests"],
];

const quickSignals = [
  ["API", "Failed requests"],
  ["UI", "Visual overflow"],
  ["A11y", "Label risks"],
  ["Flow", "Broken actions"],
];

const compactFeatures = [
  ["Finds visible risk", "Detects failed requests, JS errors, visual overflow, missing labels, and broken actions."],
  ["Captures proof", "Stores screenshots, route inventory, interaction traces, and page-level evidence while the run is active."],
  ["Creates handoff", "Turns crawl signals into findings, reports, and starter regression tests for QA teams."],
];

const demoFindings = [
  ["High", "Checkout button triggers a failed API request.", "Evidence includes request trace and screenshot."],
  ["Medium", "Mobile pricing cards overflow at 390px.", "Captured as visual evidence for regression."],
  ["Low", "Newsletter input is missing an accessible label.", "Ready for accessibility triage."],
];

const footerLinks = [
  ["Preview", "#preview"],
  ["Signals", "#signals"],
  ["Flow", "#flow"],
  ["Demo", "#demo"],
];

const liveSignals = [
  "Scanning public routes",
  "Capturing visual proof",
  "Grouping QA findings",
];

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const validateUrl = (value: string) => {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return "Enter a website URL to scan.";
  }

  try {
    const parsed = new URL(normalized);
    return ["http:", "https:"].includes(parsed.protocol) ? "" : "Use an http or https website URL.";
  } catch {
    return "Enter a valid URL, for example example.com.";
  }
};

export function LandingPage({ onOpenAuth, onTryWebsite }: LandingPageProps) {
  const [activeMode, setActiveMode] = useState<(typeof scanModes)[number]["id"]>("crawl");
  const [manualMode, setManualMode] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const mode = useMemo(() => scanModes.find((item) => item.id === activeMode) ?? scanModes[0], [activeMode]);
  const activeIndex = scanModes.findIndex((item) => item.id === activeMode);
  const activeSignal = liveSignals[Math.max(activeIndex, 0)] ?? liveSignals[0];

  useLandingAnimations();

  useEffect(() => {
    if (manualMode) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveMode((current) => {
        const index = scanModes.findIndex((item) => item.id === current);
        return scanModes[(index + 1) % scanModes.length].id;
      });
    }, 3800);

    return () => window.clearInterval(timer);
  }, [manualMode]);

  const submitTryScan = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextError = validateUrl(targetUrl);
    setUrlError(nextError);
    if (nextError) {
      return;
    }
    onTryWebsite(normalizeUrl(targetUrl));
  };

  const openDemo = () => {
    setManualMode(true);
    setActiveMode("issues");
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7FAFC] text-slate-950">
      <section className="relative min-h-screen">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#F7FAFC_0%,#ECFEFF_42%,#FFF7ED_100%)]" />
        <LandingScene />
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#15616D,#26C6DA,#FF7D00)]" />

        <header className="landing-header relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
          <button type="button" className="flex min-w-0 items-center gap-2 text-left sm:gap-3" aria-label="SK CrawlPulse home">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#001524] text-sm font-bold text-[#FFFFFF] shadow-[0_16px_36px_rgba(0,21,36,0.2)] sm:h-11 sm:w-11">
              SK
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-950">CrawlPulse</span>
              <span className="block text-xs text-slate-500">Autonomous QA</span>
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuth("login")}
              className="landing-hover min-h-10 rounded-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 sm:min-h-11 sm:px-4"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => onOpenAuth("register")}
              className="landing-hover min-h-10 rounded-full bg-[#001524] px-4 text-sm font-bold text-[#FFFFFF] shadow-[0_16px_34px_rgba(0,21,36,0.22)] transition hover:bg-[#12333B] sm:min-h-11 sm:px-5"
            >
              Start
            </button>
          </div>
        </header>

        <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-6 px-4 pb-8 pt-2 sm:px-6 sm:pb-10 sm:pt-4 md:min-h-[calc(100vh-84px)] md:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)] md:items-center md:gap-8 lg:px-8">
          <div className="min-w-0 py-4 sm:py-6">
            <div className="landing-badge inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200 bg-white/75 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-cyan-800 shadow-sm backdrop-blur sm:text-xs sm:tracking-[0.16em]">
              <span className="relative flex h-2 w-2">
                <span className="landing-live-dot absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {activeSignal}
            </div>

            <h1 className="mt-5 max-w-3xl text-[2.15rem] font-black leading-[1.04] text-slate-950 sm:text-5xl lg:text-6xl">
              <span className="landing-title-line block sm:hidden">Find broken flows fast.</span>
              <span className="landing-title-line hidden sm:block">Find broken flows on any website</span>
              <span className="landing-title-line hidden sm:block">in minutes.</span>
            </h1>
            <p className="landing-copy mt-4 max-w-xl text-base leading-7 text-slate-600 sm:mt-5 sm:text-lg sm:leading-8">
              Paste a URL. CrawlPulse maps pages, tests interactions, captures evidence, and generates QA-ready findings.
            </p>

            <form onSubmit={submitTryScan} className="landing-form mt-5 max-w-xl rounded-[1.25rem] border border-slate-200 bg-white/84 p-2 shadow-[0_20px_54px_rgba(15,23,42,0.1)] backdrop-blur sm:mt-7 sm:rounded-[1.35rem]">
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
                <label className="block">
                  <span className="sr-only">Website URL</span>
                  <input
                    value={targetUrl}
                    onChange={(event) => {
                      setTargetUrl(event.target.value);
                      if (urlError) {
                        setUrlError(validateUrl(event.target.value));
                      }
                    }}
                    placeholder="example.com"
                    className="min-h-12 w-full rounded-[1rem] border border-transparent bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100 sm:min-h-[52px]"
                    autoComplete="url"
                  />
                </label>
                <button
                  type="submit"
                  className="landing-hover min-h-12 rounded-[1rem] bg-[#FF7D00] px-5 text-base font-black text-[#FFFFFF] shadow-[0_18px_36px_rgba(255,125,0,0.28)] transition hover:bg-[#E56B00] sm:min-h-[52px]"
                >
                  Try a scan
                </button>
              </div>
              <div className="flex flex-col items-start gap-2 px-2 pb-1 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-xs font-semibold leading-5 text-slate-500">
                  No setup needed to start. Your URL is carried into the workspace.
                </p>
                <button type="button" onClick={openDemo} className="text-xs font-black text-cyan-800 transition hover:text-[#001524]">
                  Use demo result
                </button>
              </div>
              {urlError ? (
                <p className="px-2 pb-1 text-sm font-semibold text-[#B42318]">{urlError}</p>
              ) : null}
            </form>

            <div className="mt-4 grid max-w-xl grid-cols-1 gap-3 sm:flex sm:flex-wrap">
              <a
                href="#preview"
                className="landing-secondary landing-hover inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/80 px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50 sm:w-auto"
              >
                View live preview
              </a>
              <button
                type="button"
                onClick={() => onTryWebsite(DEMO_TARGET_URL)}
                className="landing-secondary landing-hover min-h-11 rounded-full border border-orange-200 bg-orange-50 px-5 text-sm font-black text-[#9A4D00] transition hover:border-orange-300 hover:bg-orange-100 sm:w-auto"
              >
                Open demo workspace
              </button>
            </div>

            <div id="flow" className="mt-6 grid max-w-xl grid-cols-3 gap-2 sm:mt-8">
              {launchSteps.map(([step, label]) => (
                <div key={step} className="landing-flow-card landing-hover rounded-2xl border border-white/70 bg-white/72 px-3 py-3 shadow-sm backdrop-blur transition hover:border-cyan-200 sm:px-3 sm:py-3">
                  <p className="text-xs font-black text-[#FF7D00]">{step}</p>
                  <p className="mt-1 text-[13px] font-bold leading-5 text-slate-800 sm:text-sm">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div id="preview" className="landing-preview relative min-w-0 py-2 sm:py-4">
            <div className="absolute -left-4 top-10 hidden h-32 w-32 rotate-6 rounded-[2rem] border border-cyan-200 bg-cyan-100/70 shadow-[0_20px_60px_rgba(38,198,218,0.22)] lg:block" />
            <div className="absolute -bottom-2 right-6 hidden h-24 w-24 -rotate-12 rounded-[1.6rem] border border-orange-200 bg-orange-100/80 shadow-[0_20px_60px_rgba(255,125,0,0.2)] lg:block" />

            <div className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/88 p-3 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur sm:rounded-[2rem] sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 sm:pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="max-w-[13rem] truncate rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 sm:max-w-none sm:px-4">
                  https://crawlpulse.sk-hub.in
                </div>
              </div>

              <div className="grid gap-3 pt-3 sm:gap-4 sm:pt-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[1.25rem] bg-[#001524] p-4 text-[#FFFFFF] sm:rounded-[1.5rem]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#A5F3FC]">Pulse run</p>
                      <h2 className="mt-3 text-[1.7rem] font-black leading-tight text-[#FFFFFF] sm:text-2xl">{mode.title}</h2>
                    </div>
                    <img src={heroImage} alt="CrawlPulse analysis preview" className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
                  </div>

                  <div className="mt-4 flex items-end justify-between rounded-2xl border border-white/10 bg-white/10 p-3 sm:mt-5 sm:p-4">
                    <div>
                      <p className="text-4xl font-black leading-none text-[#FFFFFF] sm:text-5xl">{mode.metric}</p>
                      <p className="mt-1 text-sm font-semibold text-[#CFFAFE]">{mode.metricLabel}</p>
                    </div>
                    <div className="relative h-14 w-20 overflow-hidden rounded-xl bg-cyan-300/12 p-2 sm:h-16 sm:w-24">
                      <div className="landing-scan-bar h-2 w-12 rounded-full bg-cyan-200" />
                      <div className="landing-scan-bar mt-3 h-2 w-20 rounded-full bg-orange-300" />
                      <div className="landing-scan-bar mt-3 h-2 w-14 rounded-full bg-emerald-300" />
                    </div>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-[#E2E8F0]">{mode.detail}</p>
                </div>

                <div className="grid gap-3">
                  <div className="flex rounded-full border border-slate-200 bg-slate-100 p-1">
                    {scanModes.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setManualMode(true);
                          setActiveMode(item.id);
                        }}
                        className={`min-h-10 flex-1 rounded-full px-3 text-sm font-black transition ${
                          activeMode === item.id
                            ? "bg-white text-cyan-800 shadow-sm"
                            : "text-slate-500 hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-2">
                    {mode.rows.map((row, index) => (
                      <div key={row} className="landing-hover flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-cyan-200 hover:bg-white">
                        <span className="text-sm font-bold text-slate-800">{row}</span>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-cyan-700 shadow-sm">
                          {index === 0 ? "live" : "ok"}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div id="signals" className="grid grid-cols-2 gap-2">
                    {quickSignals.map(([label, value]) => (
                      <div key={label} className="landing-hover rounded-2xl border border-cyan-900/10 bg-white px-4 py-3 shadow-sm transition hover:shadow-md">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#FF7D00]">{label}</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setManualMode(true);
                      setActiveMode(activeMode === "tests" ? "crawl" : "tests");
                    }}
                    className="landing-hover min-h-11 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 text-sm font-black text-cyan-900 transition hover:bg-white"
                  >
                    {activeMode === "tests" ? "Replay crawl preview" : "See generated tests"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="relative z-10 border-y border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 sm:px-6 md:grid-cols-3 lg:px-8">
          {compactFeatures.map(([title, body]) => (
            <article key={title} className="landing-reveal landing-hover rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-cyan-200 hover:bg-white hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <h3 className="text-base font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="relative z-10 bg-[#F7FAFC] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-4 sm:gap-8 lg:grid-cols-[0.78fr_1fr] lg:items-start">
          <div className="landing-reveal rounded-[1.25rem] border border-cyan-900/10 bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.07)] sm:rounded-[1.5rem] sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#FF7D00]">Demo evidence</p>
            <h2 className="mt-3 text-[2rem] font-black leading-[1.06] text-slate-950 sm:text-4xl">
              See the handoff before you sign in.
            </h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-slate-600 sm:mt-4">
              Preview the practical output: issue severity, captured proof, and the next QA action your team can take.
            </p>
            <div className="mt-5 grid gap-3 sm:mt-6 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={() => onTryWebsite(DEMO_TARGET_URL)}
                className="landing-hover min-h-12 rounded-full bg-[#001524] px-6 text-sm font-black text-[#FFFFFF] shadow-[0_16px_34px_rgba(0,21,36,0.22)] transition hover:bg-[#12333B]"
              >
                Try with demo URL
              </button>
              <a
                href="#preview"
                className="landing-hover inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-6 text-sm font-black text-slate-800 transition hover:border-cyan-200 hover:bg-cyan-50"
              >
                Review preview
              </a>
            </div>
            <div className="mt-5 grid gap-2 sm:mt-6 sm:grid-cols-3">
              {["3 sample issues", "Screenshots", "Generated tests"].map((item) => (
                <div key={item} className="landing-hover rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-800 sm:py-3">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            {demoFindings.map(([severity, title, detail]) => (
              <article key={title} className="landing-reveal landing-hover rounded-[1.1rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:rounded-[1.25rem]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="max-w-xl text-[15px] font-black leading-6 text-slate-950 sm:text-base">{title}</h3>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-[#9A4D00]">{severity}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="landing-reveal relative z-10 border-t border-[#12333B] bg-[#001524] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mx-auto grid w-full max-w-7xl gap-5 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#001524]">SK</span>
              <div>
                <p className="text-sm font-black text-[#FFFFFF]">CrawlPulse</p>
                <p className="text-xs font-semibold text-[#A5F3FC]">Autonomous QA evidence workspace</p>
              </div>
            </div>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#CFEAF0] sm:mt-4">
              Built for teams that need crawl evidence, defect signals, generated tests, and report-ready handoff from a single URL.
            </p>
          </div>

          <div className="grid gap-3 md:justify-items-end">
            <div className="flex flex-wrap gap-2 md:justify-end">
              {footerLinks.map(([item, href]) => (
                <a
                  key={item}
                  href={href}
                  className="rounded-full border border-[#214B57] bg-[#082B36] px-3 py-2 text-sm font-bold text-[#E6FBFF] transition hover:border-[#67E8F9] hover:bg-[#12333B] sm:px-4"
                >
                  {item}
                </a>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-[#7FB7C2] md:justify-end">
              <span>© 2026 SK CrawlPulse</span>
              <span>Quality evidence workspace</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
