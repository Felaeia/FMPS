import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import DropdownCard from "../../common/dropDownCard";
import { Tag } from "../../common/tags";
import { variantFor } from "./constant/tags";
import { FREQUENCIES, type Frequency } from "./constant/addPage";
import {
  deleteMonitoredPage,
  getMonitoredPages,
  updateMonitoredPage,
  type MonitoredPagePatch,
  type MonitoredPageRecord,
} from "./api/monitoringApi";
import { formatRelativeTime } from "./util/Scoutline_Feed.helpers";

const FIELD_LABEL = "text-[11px] font-semibold uppercase tracking-wider text-stone-400";

function buildScript(page: MonitoredPageRecord) {
  return [
    "# approved Facebook scraper · scheduled by Scoutline",
    `source: ${page.pageUrl}`,
    `frequency: ${page.frequency}`,
    `posts_per_run: ${page.postsPerRun}`,
    `include_images: ${page.includeImages}`,
    `script: ${page.scriptFileName}`,
    "",
    "steps:",
    "  - open(source); collect_public_posts()",
    "  - dedupe_by: post_url",
    `  - limit: ${page.postsPerRun}`,
  ].join("\n");
}

function PageSettings({
  page,
  onChange,
  onRemove,
}: {
  page: MonitoredPageRecord;
  onChange: (patch: MonitoredPagePatch) => void;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const label = draft.trim();
    setDraft("");
    if (!label || page.tags.some((tag) => tag.toLowerCase() === label.toLowerCase())) return;
    onChange({ tags: [...page.tags, label] });
  }

  function handleTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-2">
        <span className={FIELD_LABEL}>Scheduled scraper</span>
        <pre className="h-64 overflow-auto rounded-xl bg-stone-900 p-4 font-mono text-xs leading-relaxed text-stone-100">
          {buildScript(page)}
        </pre>
        {page.lastError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
            Latest run failed: {page.lastError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={`freq-${page.id}`} className={FIELD_LABEL}>Frequency</label>
          <select
            id={`freq-${page.id}`}
            value={page.frequency}
            onChange={(event) => onChange({ frequency: event.target.value as Frequency })}
            className="h-11 rounded-xl border border-orange-100 bg-orange-50/60 px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            {FREQUENCIES.map((frequency) => <option key={frequency}>{frequency}</option>)}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={`posts-${page.id}`} className={FIELD_LABEL}>
            Posts per run: <span className="text-stone-700">{page.postsPerRun}</span>
          </label>
          <input
            id={`posts-${page.id}`}
            type="range"
            min={1}
            max={10}
            value={page.postsPerRun}
            onChange={(event) => onChange({ postsPerRun: Number(event.target.value) })}
            className="accent-orange-700"
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-stone-700">
          <button
            type="button"
            role="switch"
            aria-checked={page.includeImages}
            aria-label="Include images"
            onClick={() => onChange({ includeImages: !page.includeImages })}
            className={`relative h-6 w-11 rounded-full transition-colors ${page.includeImages ? "bg-emerald-600" : "bg-stone-300"}`}
          >
            <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${page.includeImages ? "translate-x-5" : ""}`} />
          </button>
          Include images
        </label>

        <div className="flex flex-col gap-2">
          <span className={FIELD_LABEL}>Feed tags</span>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-orange-100 bg-orange-50/60 p-3">
            {page.tags.map((tag) => (
              <Tag key={tag} label={tag} variant={variantFor(tag)} onRemove={() => onChange({ tags: page.tags.filter((item) => item !== tag) })} />
            ))}
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag, press Enter"
              className="min-w-[140px] flex-1 bg-transparent text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onChange({ paused: !page.paused })}
            className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
          >
            {page.paused ? "Resume monitoring" : "Pause monitoring"}
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="h-11 rounded-xl border border-red-200 bg-white px-5 text-sm font-medium text-red-500 transition hover:bg-red-50"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Scoutline_MonitoredPage() {
  const [pages, setPages] = useState<MonitoredPageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const refreshPages = useCallback(async (signal?: AbortSignal) => {
    try {
      const result = await getMonitoredPages(signal);
      if (!signal?.aborted) {
        setPages(result);
        setError("");
      }
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Could not load monitored pages.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => refreshPages(controller.signal));
    const intervalId = window.setInterval(() => void refreshPages(), 10_000);
    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [refreshPages]);

  async function changePage(id: string, patch: MonitoredPagePatch) {
    const previousPages = pages;
    setPages((current) => current.map((page) => page.id === id ? { ...page, ...patch } : page));
    try {
      const updated = await updateMonitoredPage(id, patch);
      setPages((current) => current.map((page) => page.id === id ? updated : page));
      setError("");
    } catch (cause) {
      setPages(previousPages);
      setError(cause instanceof Error ? cause.message : "Could not update the monitored page.");
    }
  }

  async function removePage(id: string) {
    try {
      await deleteMonitoredPage(id);
      setPages((current) => current.filter((page) => page.id !== id));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove the monitored page.");
    }
  }

  const liveCount = pages.filter((page) => !page.paused).length;

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50 via-[#fffaf5] to-[#fffaf5] p-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-stone-800">Monitored pages</h1>
            <p className="mt-1 text-sm text-stone-400">{pages.length} monitored · {liveCount} live</p>
          </div>
          <button type="button" className="rounded-xl bg-orange-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800" onClick={() => navigate("/addPage")}>
            + Add page
          </button>
        </header>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-stone-500">Loading monitored pages…</p> : null}
        {!loading && pages.length === 0 && !error && <p className="rounded-2xl border border-orange-100 bg-white/70 p-6 text-sm text-stone-500">No pages are being monitored yet. Add a page to start collecting posts.</p>}

        <div className="flex flex-col gap-4">
          {pages.map((page, index) => (
            <DropdownCard
              key={page.id}
              defaultOpen={index === 0}
              title={page.name}
              subtitle={page.pageUrl.replace(/^https?:\/\//, "")}
              avatar={<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 font-bold text-white">{page.name[0]?.toUpperCase()}</div>}
              tags={page.tags.map((tag) => <Tag key={tag} label={tag} variant={variantFor(tag)} />)}
              meta={[page.frequency, `${page.postsPerRun}/run`, ...(page.includeImages ? ["images"] : [])]}
              status={(
                <div className="min-w-[120px] text-xs text-stone-500">
                  <p className="flex items-center gap-1.5 font-medium text-stone-700">
                    <span className={`h-2 w-2 rounded-full ${page.paused ? "bg-stone-400" : page.isRunning ? "animate-pulse bg-orange-500" : "bg-emerald-600"}`} />
                    {page.paused ? "Paused" : page.isRunning ? "Running" : "Scheduled"}
                  </p>
                  <p>{page.lastChecked ? `checked ${formatRelativeTime(page.lastChecked)}` : "waiting for first run"}</p>
                  {!page.paused && <p>next {new Date(page.nextRunAt).toLocaleString()}</p>}
                </div>
              )}
            >
              <PageSettings page={page} onChange={(patch) => void changePage(page.id, patch)} onRemove={() => void removePage(page.id)} />
            </DropdownCard>
          ))}
        </div>
      </div>
    </div>
  );
}