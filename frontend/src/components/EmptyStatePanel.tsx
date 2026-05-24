type EmptyStatePanelProps = {
  title: string;
  description: string;
  actionLabel: string;
  actionHint: string;
  tone?: "active" | "pass" | "warn" | "fail";
};

export function EmptyStatePanel({
  title,
  description,
  actionLabel,
  actionHint,
  tone = "active",
}: EmptyStatePanelProps) {
  const toneClass =
    tone === "fail"
      ? "semantic-fail"
      : tone === "warn"
        ? "semantic-warn"
        : tone === "pass"
          ? "semantic-pass"
          : "semantic-active";

  return (
    <section className={`empty-state-panel empty-state-shell ${toneClass} fade-in-up`}>
      <div className="max-w-lg text-center">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
        <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/55 px-4 py-2">
          <span className="text-xs uppercase tracking-[0.2em] text-white">{actionLabel}</span>
          <span className="text-xs text-slate-400">{actionHint}</span>
        </div>
      </div>
    </section>
  );
}
