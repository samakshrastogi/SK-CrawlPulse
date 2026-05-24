type MobileActionBarProps = {
  canRetry: boolean;
  canCompare: boolean;
  canSave: boolean;
  onRun: () => void;
  onRetry: () => void;
  onCompare: () => void;
  onSave: () => void;
};

export function MobileActionBar({
  canRetry,
  canCompare,
  canSave,
  onRun,
  onRetry,
  onCompare,
  onSave,
}: MobileActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-slate-950/94 px-4 py-3 backdrop-blur-xl md:hidden">
      <div className="grid grid-cols-4 gap-2">
        <ActionButton label="Run" tone="active" onClick={onRun} />
        <ActionButton label="Retry" tone="fail" disabled={!canRetry} onClick={onRetry} />
        <ActionButton label="Compare" tone="warn" disabled={!canCompare} onClick={onCompare} />
        <ActionButton label="Save" tone="pass" disabled={!canSave} onClick={onSave} />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  onClick,
}: {
  label: string;
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
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl border px-3 py-3 text-xs font-medium ${toneClass} disabled:cursor-not-allowed disabled:opacity-35`}
    >
      {label}
    </button>
  );
}
