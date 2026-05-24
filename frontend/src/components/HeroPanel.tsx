export function HeroPanel() {
  return (
    <div className="rounded-[1.8rem] border border-cyan-400/20 bg-slate-950/78 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.45)] backdrop-blur">
      <p className="mb-3 text-sm uppercase tracking-[0.35em] text-cyan-300">SK CrawlPulse</p>
      <h1 className="max-w-3xl text-3xl font-semibold leading-tight text-white md:text-5xl">
        Compact QA automation workspace.
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">Run, inspect, review.</p>
    </div>
  );
}
