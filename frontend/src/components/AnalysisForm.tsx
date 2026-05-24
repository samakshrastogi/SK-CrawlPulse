import type { FormEvent } from "react";

type AnalysisFormProps = {
  targetUrl: string;
  repoUrl: string;
  uploadedPath: string;
  loading: boolean;
  error: string;
  urlError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onTargetUrlChange: (value: string) => void;
  onRepoUrlChange: (value: string) => void;
  onUploadedPathChange: (value: string) => void;
};

const inputClassName =
  "w-full rounded-[1.1rem] border border-white/10 bg-slate-900/78 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition duration-200 focus:border-cyan-400/60 focus:bg-slate-900 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.08)]";

const fieldLabelClassName = "mb-1.5 block text-[11px] uppercase tracking-[0.2em] text-slate-400";

export function AnalysisForm({
  targetUrl,
  repoUrl,
  uploadedPath,
  loading,
  error,
  urlError,
  onSubmit,
  onTargetUrlChange,
  onRepoUrlChange,
  onUploadedPathChange,
}: AnalysisFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="text-slate-100"
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
          <span className="mt-1.5 block text-xs leading-5 text-slate-500">
            Website entry point to crawl and test. Use a public or reachable `http` or `https` URL.
          </span>
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
          <span className="mt-1.5 block text-xs leading-5 text-slate-500">
            Optional. Used to match observed frontend API calls against backend source context.
          </span>
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
          <span className="mt-1.5 block text-xs leading-5 text-slate-500">
            Optional. Local or uploaded backend artifact path when repository access is not available.
          </span>
        </label>

        <div className="flex flex-col">
          <span className={fieldLabelClassName}>Action</span>
          <button
            type="submit"
            disabled={loading || Boolean(urlError) || targetUrl.trim().length === 0}
            className="inline-flex min-h-[48px] w-full flex-1 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,rgba(34,211,238,0.95)_0%,rgba(8,145,178,0.95)_100%)] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300 disabled:hover:brightness-100"
          >
            {loading ? "Running..." : "Start analysis"}
          </button>
          <span className="mt-1.5 block text-xs leading-5 text-slate-500">
            Starts crawl, interaction testing, evidence capture, and backend correlation when context is supplied.
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-[1.2rem] border border-white/10 bg-slate-950/55 px-4 py-3">
        <p className="text-[11px] uppercase tracking-[0.2em] text-cyan-300">Default run behavior</p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          The platform runs with bounded crawl depth, interaction caps, robots awareness, strict behavior checks, and
          login prompting enabled. The active run page will show the exact scope after submission.
        </p>
      </div>

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
