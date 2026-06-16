import type { FormEvent } from "react";
import type { AnalysisOptions } from "../types/analysis";

type AnalysisFormProps = {
  targetUrl: string;
  repoUrl: string;
  uploadedPath: string;
  analysisOptions: AnalysisOptions;
  loading: boolean;
  error: string;
  urlError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTargetUrlChange: (value: string) => void;
  onRepoUrlChange: (value: string) => void;
  onUploadedPathChange: (value: string) => void;
  onAnalysisOptionsChange: (value: AnalysisOptions) => void;
};

const inputClassName =
  "form-input w-full rounded-[1.1rem] border px-4 py-3 text-sm outline-none transition duration-200";

const fieldLabelClassName = "mb-1.5 block text-[11px] uppercase tracking-[0.2em] text-slate-400";

export function AnalysisForm({
  targetUrl,
  repoUrl,
  uploadedPath,
  analysisOptions,
  loading,
  error,
  urlError,
  onSubmit,
  onTargetUrlChange,
  onRepoUrlChange,
  onUploadedPathChange,
  onAnalysisOptionsChange,
}: AnalysisFormProps) {
  const updateOptions = (next: Partial<AnalysisOptions>) => {
    onAnalysisOptionsChange({
      ...analysisOptions,
      ...next,
    });
  };

  const updateNumberOption = (key: keyof Pick<AnalysisOptions, "maxPages" | "maxLinksPerPage" | "maxDepth" | "maxInteractionsPerPage">, value: string) => {
    const parsed = Number(value);
    updateOptions({ [key]: Number.isFinite(parsed) ? Math.max(1, parsed) : 1 });
  };

  const updatePatternList = (key: keyof Pick<AnalysisOptions, "domainAllowlist" | "excludePathPatterns">, value: string) => {
    updateOptions({
      [key]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };

  const toggleDevice = (device: NonNullable<AnalysisOptions["mobileDevices"]>[number]) => {
    const current = analysisOptions.mobileDevices ?? ["Desktop"];
    const next = current.includes(device) ? current.filter((item) => item !== device) : [...current, device];
    updateOptions({ mobileDevices: next.length > 0 ? next : ["Desktop"] });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="analysis-command-form text-slate-100"
    >
      <div className="grid gap-3 lg:grid-cols-[1.45fr_0.95fr_0.95fr_180px]">
        <label className="block">
          <span className={fieldLabelClassName}>Target URL</span>
          <input
            className={inputClassName}
            type="url"
            required
            value={targetUrl}
            onChange={(event) => onTargetUrlChange(event.target.value)}
            placeholder="https://example.com"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className={fieldLabelClassName}>Backend Repo</span>
          <input
            className={inputClassName}
            value={repoUrl}
            onChange={(event) => onRepoUrlChange(event.target.value)}
            placeholder="https://github.com/org/repo"
            autoComplete="off"
          />
        </label>

        <label className="block">
          <span className={fieldLabelClassName}>Backend Path</span>
          <input
            className={inputClassName}
            value={uploadedPath}
            onChange={(event) => onUploadedPathChange(event.target.value)}
            placeholder="artifacts/upload.zip"
            autoComplete="off"
          />
        </label>

        <div className="flex flex-col">
          <span className={fieldLabelClassName}>Action</span>
          <button
            type="submit"
            disabled={loading || Boolean(urlError) || targetUrl.trim().length === 0}
            className="primary-cta inline-flex min-h-[48px] w-full flex-1 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,rgba(34,211,238,0.95)_0%,rgba(8,145,178,0.95)_100%)] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:hover:brightness-100"
          >
            {loading ? "Running..." : "Start analysis"}
          </button>
        </div>
      </div>

      <details className="mt-3 rounded-[1.1rem] border border-white/10 bg-slate-950/45 px-4 py-3">
        <summary className="cursor-pointer text-[11px] uppercase tracking-[0.2em] text-cyan-300">
          Scan configuration
        </summary>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <label className="block">
            <span className={fieldLabelClassName}>Crawl profile</span>
            <select
              className={inputClassName}
              value={analysisOptions.crawlProfile ?? "auto"}
              onChange={(event) => updateOptions({ crawlProfile: event.target.value as AnalysisOptions["crawlProfile"] })}
            >
              <option value="auto">Auto</option>
              <option value="generic">Generic</option>
              <option value="youtube">YouTube</option>
              <option value="ecommerce">Ecommerce</option>
              <option value="dashboard">Dashboard</option>
              <option value="auth-heavy">Auth-heavy</option>
            </select>
          </label>

          <NumberField
            label="Max pages"
            value={analysisOptions.maxPages}
            onChange={(value) => updateNumberOption("maxPages", value)}
          />
          <NumberField
            label="Max depth"
            value={analysisOptions.maxDepth}
            onChange={(value) => updateNumberOption("maxDepth", value)}
          />
          <NumberField
            label="Interactions/page"
            value={analysisOptions.maxInteractionsPerPage}
            onChange={(value) => updateNumberOption("maxInteractionsPerPage", value)}
          />
          <NumberField
            label="Links/page"
            value={analysisOptions.maxLinksPerPage}
            onChange={(value) => updateNumberOption("maxLinksPerPage", value)}
          />

          <label className="block lg:col-span-2">
            <span className={fieldLabelClassName}>Domain allowlist</span>
            <input
              className={inputClassName}
              value={(analysisOptions.domainAllowlist ?? []).join(", ")}
              onChange={(event) => updatePatternList("domainAllowlist", event.target.value)}
              placeholder="example.com, docs.example.com"
              autoComplete="off"
            />
          </label>

          <label className="block lg:col-span-2">
            <span className={fieldLabelClassName}>Exclude paths</span>
            <input
              className={inputClassName}
              value={(analysisOptions.excludePathPatterns ?? []).join(", ")}
              onChange={(event) => updatePatternList("excludePathPatterns", event.target.value)}
              placeholder="logout, delete, /admin/private"
              autoComplete="off"
            />
          </label>

          <div className="lg:col-span-4">
            <span className={fieldLabelClassName}>Mobile devices</span>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
              {(["Desktop", "iPhone 15", "Pixel 7", "Galaxy S23", "iPad"] as const).map((device) => (
                <label key={device} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-200">
                  <span>{device}</span>
                  <input
                    type="checkbox"
                    checked={(analysisOptions.mobileDevices ?? ["Desktop"]).includes(device)}
                    onChange={() => toggleDevice(device)}
                    className="h-4 w-4 accent-cyan-300"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <ToggleField
            label="Respect robots.txt"
            checked={analysisOptions.respectRobotsTxt !== false}
            onChange={(checked) => updateOptions({ respectRobotsTxt: checked })}
          />
          <ToggleField
            label="Stream previews"
            checked={analysisOptions.streamHtmlPreview !== false}
            onChange={(checked) => updateOptions({ streamHtmlPreview: checked })}
          />
          <ToggleField
            label="Strict behavior"
            checked={analysisOptions.strictBehaviorMode === true}
            onChange={(checked) => updateOptions({ strictBehaviorMode: checked })}
          />
          <ToggleField
            label="Prompt for login"
            checked={analysisOptions.promptForLogin === true}
            onChange={(checked) =>
              updateOptions({
                promptForLogin: checked,
                loginPrompt: {
                  ...analysisOptions.loginPrompt,
                  enabled: checked,
                },
              })
            }
          />
        </div>
      </details>

      {urlError ? (
        <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {urlError}
        </div>
      ) : null}

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}
    </form>
  );
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className={fieldLabelClassName}>{label}</span>
      <input
        className={inputClassName}
        type="number"
        min={1}
        value={value ?? 1}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-200">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-cyan-300"
      />
    </label>
  );
}
