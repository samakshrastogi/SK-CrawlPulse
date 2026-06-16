import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { EmptyStatePanel } from "./EmptyStatePanel";
import type { AnalysisResponse, GlobalFilters } from "../types/analysis";

type PagesViewProps = {
  result: AnalysisResponse | null;
  filters: GlobalFilters;
};

type PageItem = AnalysisResponse["frontend"]["pages"][number];

type RouteTreeNode = {
  key: string;
  label: string;
  children: RouteTreeNode[];
  page?: PageItem;
};

export function PagesView({ result, filters }: PagesViewProps) {
  const allPages = useMemo(
    () => result?.frontend.pages ?? [],
    [result?.frontend.pages],
  );
  const [activeUrl, setActiveUrl] = useState("");
  const [query, setQuery] = useState("");
  const [expandedPanel, setExpandedPanel] = useState<null | "preview" | "html">(null);

  const visiblePages = useMemo(
    () =>
      allPages.filter((page) => {
        const routeOk = filters.route === "all" || page.routePath === filters.route;
        const textOk = `${page.title} ${page.routePath} ${page.url}`.toLowerCase().includes(query.toLowerCase());
        return routeOk && textOk;
      }),
    [allPages, filters.route, query],
  );

  const routeTree = useMemo(() => buildRouteTree(visiblePages), [visiblePages]);
  const activePage = visiblePages.find((page) => page.url === activeUrl) ?? visiblePages[0];
  const pageFindings = useMemo(
    () => result?.frontend.runtimeFindings.filter((finding) => finding.pageUrl === activePage?.url) ?? [],
    [activePage?.url, result?.frontend.runtimeFindings],
  );
  const pageInteractions = useMemo(
    () => result?.frontend.interactionResults.filter((interaction) => interaction.pageUrl === activePage?.url) ?? [],
    [activePage?.url, result?.frontend.interactionResults],
  );
  const pageFailureClusters = useMemo(
    () => result?.frontend.failureClusters.filter((cluster) => cluster.pages.includes(activePage?.url ?? "")) ?? [],
    [activePage?.url, result?.frontend.failureClusters],
  );
  const navigationContext = useMemo(() => {
    if (!activePage) {
      return { inbound: [], outbound: [] };
    }

    return {
      inbound: result?.frontend.navigationGraph.filter((edge) => edge.to === activePage.url) ?? [],
      outbound: result?.frontend.navigationGraph.filter((edge) => edge.from === activePage.url) ?? [],
    };
  }, [activePage, result?.frontend.navigationGraph]);
  const interactionDensity = activePage ? activePage.buttons.length + activePage.links.length + activePage.forms.length : 0;
  const failedInteractions = pageInteractions.filter((interaction) => interaction.result === "FAIL");
  const passedInteractions = pageInteractions.filter((interaction) => interaction.result === "PASS");
  const pageSummary = activePage
    ? describePage(activePage, {
        findingsCount: pageFindings.length,
        failedInteractions: failedInteractions.length,
        passedInteractions: passedInteractions.length,
        inboundCount: navigationContext.inbound.length,
        outboundCount: navigationContext.outbound.length,
      })
    : "";

  useEffect(() => {
    setActiveUrl(visiblePages[0]?.url ?? "");
  }, [result?.runId, query, filters.route, visiblePages]);

  if (!activePage) {
    return (
      <EmptyStatePanel
        title="No pages in this slice"
        actionLabel="Try"
        tone="active"
      />
    );
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
      <article className="min-w-0 rounded-[1.8rem] border border-white/10 bg-slate-950/82 p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Route tree</p>
              <h2 className="mt-3 break-words text-2xl font-semibold text-white">{activePage.title}</h2>
            </div>
            <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
              {visiblePages.length}
            </span>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pages"
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none"
          />
        </div>

        <div className="mt-5 rounded-2xl border border-white/10 bg-slate-900/50 p-4">
          <div className="grid gap-2">
            {routeTree.map((node) => (
            <RouteTreeBranch key={node.key} node={node} activeUrl={activePage.url} onSelect={setActiveUrl} depth={0} />
            ))}
          </div>
        </div>
      </article>

      <article className="grid gap-4 rounded-[1.8rem] border border-white/10 bg-slate-900/72 p-5 sm:p-6">
        <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/70 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">URL</p>
          <p className="mt-3 break-all text-sm leading-7 text-slate-300">{activePage.url}</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">{pageSummary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <PageBadge tone="neutral" label={`${pageFindings.length} findings`} />
            <PageBadge tone={failedInteractions.length > 0 ? "danger" : "positive"} label={`${failedInteractions.length} failed checks`} />
            <PageBadge tone="neutral" label={`${passedInteractions.length} passed checks`} />
            <PageBadge tone="neutral" label={`${navigationContext.inbound.length} inbound`} />
            <PageBadge tone="neutral" label={`${navigationContext.outbound.length} outbound`} />
            {activePage.previewImageUrl || activePage.htmlPreview ? <PageBadge tone="positive" label="Preview available" /> : null}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            <CompactMetric label="Depth" value={String(activePage.depth)} />
            <CompactMetric label="Route" value={activePage.routePath} />
            <CompactMetric label="Buttons" value={String(activePage.buttons.length)} />
            <CompactMetric label="Forms" value={String(activePage.forms.length)} />
            <CompactMetric label="Links" value={String(activePage.links.length)} />
            <CompactMetric label="Headings" value={String(activePage.headings.length)} />
            <CompactMetric label="Checks" value={String(pageInteractions.length)} />
            <CompactMetric label="Density" value={String(interactionDensity)} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Page preview</p>
              <button
                type="button"
                onClick={() => setExpandedPanel("preview")}
                aria-label="Expand page preview"
                title="Expand page preview"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-100"
              >
                <ExpandIcon />
              </button>
            </div>
            {activePage.previewImageUrl ? (
              <img
                src={activePage.previewImageUrl}
                alt={activePage.title}
                className="mt-4 h-[18rem] w-full rounded-2xl border border-white/10 object-cover"
              />
            ) : (
              <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-10 text-sm text-slate-500">
                No screenshot preview was captured for this page.
              </div>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">HTML preview</p>
              <button
                type="button"
                onClick={() => setExpandedPanel("html")}
                aria-label="Expand HTML preview"
                title="Expand HTML preview"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-100"
              >
                <ExpandIcon />
              </button>
            </div>
            <pre className="mt-4 max-h-[18rem] overflow-auto rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-xs leading-6 text-slate-300">
              {activePage.htmlPreview || "No HTML preview was captured for this page."}
            </pre>
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Primary headings</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {activePage.headings.slice(0, 6).map((heading) => (
              <span key={heading} className="min-w-0 break-words rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
                {heading}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MiniList
            title="Buttons"
            items={activePage.buttons.slice(0, 8).map((button) => `${button.text || "Untitled button"} - ${button.selector}`)}
          />
          <MiniList
            title="Links"
            items={activePage.links.slice(0, 8).map((link) => `${link.text || "Untitled link"} - ${link.selector}`)}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <MiniList
            title="Forms"
            items={activePage.forms.slice(0, 6).map((form) => form.selector)}
          />
          <ConnectionList
            title="Inbound paths"
            items={navigationContext.inbound.map((edge) => `${toShortPath(edge.from)} via ${edge.action}`)}
            emptyLabel="No inbound navigation captured"
          />
          <ConnectionList
            title="Outbound paths"
            items={navigationContext.outbound.map((edge) => `${edge.action} to ${toShortPath(edge.to)}`)}
            emptyLabel="No outbound navigation captured"
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <InsightPanel
            title="Runtime findings"
            tone="danger"
            items={pageFindings.slice(0, 4).map((finding) => ({
              title: `${finding.severity.toUpperCase()} · ${finding.type}`,
              body: finding.summary,
            }))}
            emptyLabel="No runtime findings on this page"
          />
          <InsightPanel
            title="Interaction results"
            tone="neutral"
            items={pageInteractions.slice(0, 5).map((interaction) => ({
              title: `${interaction.result} · ${interaction.text || interaction.selector}`,
              body: interaction.issueSummary || interaction.domDiffSummary || interaction.selector,
            }))}
            emptyLabel="No interaction checks were recorded for this page"
          />
          <InsightPanel
            title="Failure clusters"
            tone="danger"
            items={pageFailureClusters.slice(0, 4).map((cluster) => ({
              title: cluster.title,
              body: cluster.summary,
            }))}
            emptyLabel="No failure clusters mapped to this page"
          />
        </div>

        <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Notes</p>
          <div className="mt-3 grid gap-2">
            {activePage.interactionNotes.length > 0 ? (
              activePage.interactionNotes.slice(0, 4).map((note) => (
                <div key={note} className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3 text-sm text-slate-300">
                  {note}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/30 px-3 py-3 text-sm text-slate-500">
                No interaction notes were captured for this page.
              </div>
            )}
          </div>
        </div>
      </article>

      {expandedPanel ? (
        <PreviewModal
          title={expandedPanel === "preview" ? `${activePage.title} preview` : `${activePage.title} HTML preview`}
          onClose={() => setExpandedPanel(null)}
        >
          {expandedPanel === "preview" ? (
            activePage.previewImageUrl ? (
              <img
                src={activePage.previewImageUrl}
                alt={activePage.title}
                className="max-h-[80vh] w-full rounded-2xl border border-white/10 object-contain"
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-10 text-sm text-slate-500">
                No screenshot preview was captured for this page.
              </div>
            )
          ) : (
            <pre className="max-h-[80vh] overflow-auto rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs leading-6 text-slate-300">
              {activePage.htmlPreview || "No HTML preview was captured for this page."}
            </pre>
          )}
        </PreviewModal>
      ) : null}
    </section>
  );
}

function RouteTreeBranch({
  node,
  activeUrl,
  onSelect,
  depth,
}: {
  node: RouteTreeNode;
  activeUrl: string;
  onSelect: (url: string) => void;
  depth: number;
}) {
  const isPage = Boolean(node.page);
  const active = node.page?.url === activeUrl;

  return (
    <div className="grid gap-2">
      <div style={{ marginLeft: `${depth * 14}px` }}>
        {isPage ? (
          <button
            type="button"
            onClick={() => node.page && onSelect(node.page.url)}
            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
              active
                ? "border-cyan-300/25 bg-cyan-400/10 text-cyan-100 live-update"
                : "border-white/10 bg-slate-950/55 text-slate-300"
            }`}
          >
            <div className="min-w-0">
              <span className="block truncate font-medium">{node.page?.title || node.label}</span>
              <div className="mt-2 flex flex-wrap gap-2">
                <TreeBadge label={node.page?.routePath || node.label} />
                {node.page?.forms.length ? <TreeBadge label={`${node.page.forms.length} forms`} /> : null}
                {node.page?.previewImageUrl ? <TreeBadge label="preview" /> : null}
                {node.page?.interactionNotes.length ? <TreeBadge label={`${node.page.interactionNotes.length} notes`} /> : null}
              </div>
            </div>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs uppercase tracking-[0.18em] text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-300" />
            {node.label}
          </div>
        )}
      </div>

      {node.children.map((child) => (
        <RouteTreeBranch key={child.key} node={child} activeUrl={activeUrl} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

function buildRouteTree(pages: PageItem[]) {
  const root: RouteTreeNode[] = [];

  pages.forEach((page) => {
    const url = new URL(page.url);
    const parts = [url.hostname, ...url.pathname.split("/").filter(Boolean)];
    let currentLevel = root;
    let pathKey = "";

    parts.forEach((part, index) => {
      pathKey = `${pathKey}/${part}`;
      let node = currentLevel.find((item) => item.key === pathKey);
      if (!node) {
        node = {
          key: pathKey,
          label: part || "/",
          children: [],
        };
        currentLevel.push(node);
      }

      if (index === parts.length - 1) {
        node.page = page;
      }
      currentLevel = node.children;
    });
  });

  const normalize = (nodes: RouteTreeNode[]): RouteTreeNode[] =>
    nodes
      .map((node) => ({
        ...node,
        children: normalize(node.children),
      }))
      .sort((left, right) => left.label.localeCompare(right.label));

  return normalize(root.filter((node) => !node.key.slice(1).includes("/")));
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? items.map((item) => (
          <span key={item} className="min-w-0 break-words rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs leading-6 text-slate-300">
            {item}
          </span>
        )) : <span className="text-xs text-slate-500">None</span>}
      </div>
    </div>
  );
}

function ConnectionList({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{title}</p>
      <div className="mt-3 grid gap-2">
        {items.length > 0 ? items.map((item) => (
          <span key={item} className="min-w-0 break-words rounded-xl border border-white/10 bg-slate-950/55 px-3 py-2 text-xs leading-6 text-slate-300">
            {item}
          </span>
        )) : <span className="text-xs text-slate-500">{emptyLabel}</span>}
      </div>
    </div>
  );
}

function InsightPanel({
  title,
  tone,
  items,
  emptyLabel,
}: {
  title: string;
  tone: "neutral" | "danger";
  items: Array<{ title: string; body: string }>;
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{title}</p>
      <div className="mt-3 grid gap-3">
        {items.length > 0 ? items.map((item) => (
          <div
            key={`${item.title}-${item.body}`}
            className={`rounded-xl border px-3 py-3 ${
              tone === "danger"
                ? "border-rose-400/20 bg-rose-400/10"
                : "border-white/10 bg-slate-950/55"
            }`}
          >
            <p className="text-sm font-medium text-white">{item.title}</p>
            <p className="mt-2 text-xs leading-6 text-slate-300">{item.body}</p>
          </div>
        )) : <span className="text-xs text-slate-500">{emptyLabel}</span>}
      </div>
    </div>
  );
}

function PreviewModal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-6xl rounded-[1.8rem] border border-white/10 bg-slate-900/95 p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300 transition hover:border-cyan-300/25 hover:text-cyan-100"
          >
            Close
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-4 w-4">
      <path
        d="M7 3H3v4M13 3h4v4M17 13v4h-4M3 13v4h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 8 3 3M12 8l5-5M12 12l5 5M8 12l-5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PageBadge({ tone, label }: { tone: "neutral" | "positive" | "danger"; label: string }) {
  const toneClass =
    tone === "danger"
      ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
      : tone === "positive"
        ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100"
        : "border-white/10 bg-white/5 text-slate-300";

  return <span className={`rounded-full border px-3 py-1 text-xs ${toneClass}`}>{label}</span>;
}

function TreeBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.15em] text-slate-400">
      {label}
    </span>
  );
}

function toShortPath(value: string) {
  try {
    const url = new URL(value);
    return `${url.pathname || "/"}${url.search}`;
  } catch {
    return value;
  }
}

function describePage(
  page: PageItem,
  context: {
    findingsCount: number;
    failedInteractions: number;
    passedInteractions: number;
    inboundCount: number;
    outboundCount: number;
  },
) {
  const formPart = page.forms.length > 0 ? `${page.forms.length} form${page.forms.length === 1 ? "" : "s"}` : "no forms";
  const ctaCount = page.buttons.length + page.links.length;
  const findingPart =
    context.findingsCount > 0 ? `${context.findingsCount} runtime finding${context.findingsCount === 1 ? "" : "s"}` : "no runtime findings";
  const failurePart =
    context.failedInteractions > 0
      ? `${context.failedInteractions} failed interaction check${context.failedInteractions === 1 ? "" : "s"}`
      : `${context.passedInteractions} successful interaction check${context.passedInteractions === 1 ? "" : "s"}`;
  const navPart = `${context.inboundCount} inbound path${context.inboundCount === 1 ? "" : "s"} and ${context.outboundCount} outbound path${context.outboundCount === 1 ? "" : "s"}`;

  return `${page.title || page.routePath} is a depth-${page.depth} page with ${formPart}, ${ctaCount} primary actions, ${findingPart}, ${failurePart}, and ${navPart}.`;
}
