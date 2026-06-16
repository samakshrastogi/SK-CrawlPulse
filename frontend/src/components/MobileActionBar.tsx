type MobileActionBarProps = {
  canRetry: boolean;
  canCompare: boolean;
  canSave: boolean;
  onRun: () => void;
  onRetry: () => void;
  onCompare: () => void;
  onSave: () => void;
  onProfile: () => void;
};

export function MobileActionBar({
  canRetry,
  canCompare,
  canSave,
  onRun,
  onRetry,
  onCompare,
  onSave,
  onProfile,
}: MobileActionBarProps) {
  return (
    <div className="mobile-action-shell fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/94 px-3 py-2 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-5 gap-1.5">
        <ActionButton label="Run" shortLabel="Run" tone="active" onClick={onRun} />
        <ActionButton label="Retry" shortLabel="Try" tone="fail" disabled={!canRetry} onClick={onRetry} />
        <ActionButton label="Compare" shortLabel="Cmp" tone="warn" disabled={!canCompare} onClick={onCompare} />
        <ActionButton label="Save" shortLabel="Save" tone="pass" disabled={!canSave} onClick={onSave} />
        <ActionButton label="Profile" shortLabel="Me" tone="active" onClick={onProfile} />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  shortLabel,
  tone,
  disabled,
  onClick,
}: {
  label: string;
  shortLabel: string;
  tone: "active" | "pass" | "warn" | "fail";
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneClass =
    tone === "fail"
      ? "border-rose-300/20 bg-rose-400/10 text-rose-200"
      : tone === "warn"
        ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
        : tone === "pass"
          ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
          : "border-cyan-300/20 bg-cyan-400/10 text-cyan-200";

  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`min-w-0 rounded-[0.95rem] border px-1.5 py-2.5 text-[11px] font-semibold ${toneClass} disabled:cursor-not-allowed disabled:opacity-35`}
    >
      <span className="block truncate">{shortLabel}</span>
    </button>
  );
}
