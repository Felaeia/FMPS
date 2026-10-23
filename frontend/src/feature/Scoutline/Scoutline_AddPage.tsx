import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfigureStep from "./components/configureStep";
import ScriptStep from "./components/scriptStep";
import PreviewStep from "./components/previewStep";
import StagePanel from "../../common/stagePanel";
import {
  INITIAL_CONFIG,
  STAGES,
  type AddPageConfig,
  type AddPageStage,
  type NewPageDraft,
  type PreviewStatus,
  type ScriptStatus,
} from "./constant/addPage";
import {
  normalizeUrl,
  resolveName,
} from "../Scoutline/util/Scoutline_AddPage.helpers";
import {
  generateScraperScript,
  runScraperPreview,
  type ScraperSnapshot,
  type ScrapedPost,
} from "./api/addPageApi";
import type { MonitoredPageRecord } from "./api/monitoringApi";

type Props = {
  onComplete: (draft: NewPageDraft) => Promise<MonitoredPageRecord>;
  onPublishPreview: (pageId: string, snapshot: ScraperSnapshot) => Promise<MonitoredPageRecord>;
  // Tags already used on monitored pages, offered as suggestions.
  existingTags?: string[];
};

// Progress pills: done = green, current = orange, upcoming = muted.
function StageStepper({ stage }: { stage: AddPageStage }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {STAGES.map((label, i) => (
        <li
          key={label}
          aria-current={i === stage ? "step" : undefined}
          className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
            i < stage
              ? "border-emerald-600 text-emerald-700"
              : i === stage
                ? "border-orange-700 bg-orange-50 text-stone-800"
                : "border-orange-100 text-stone-400"
          }`}
        >
          {label}
        </li>
      ))}
    </ol>
  );
}

export default function Scoutline_AddPage({
  onComplete,
  onPublishPreview,
  existingTags = [],
}: Props) {
  const [config, setConfig] = useState<AddPageConfig>(INITIAL_CONFIG);
  const [stage, setStage] = useState<AddPageStage>(0);
  const [script, setScript] = useState("");
  const [scriptFileName, setScriptFileName] = useState<string | null>(null);
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>("idle");
  const [previewLog, setPreviewLog] = useState<string[]>([]);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");
  const [previewPosts, setPreviewPosts] = useState<ScrapedPost[]>([]);
  const [previewSnapshot, setPreviewSnapshot] = useState<ScraperSnapshot | null>(null);
  const [previewPostCount, setPreviewPostCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [feedPostError, setFeedPostError] = useState("");
  const [approvedPageId, setApprovedPageId] = useState<string | null>(null);
  const [showApprovalConfirmation, setShowApprovalConfirmation] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const navigate = useNavigate();

  // Abort network work if the user starts over or leaves the flow.
  const requestAbort = useRef<AbortController | null>(null);
  const approvalInProgress = useRef(false);

  function cancelAgents() {
    requestAbort.current?.abort();
    requestAbort.current = null;
  }

  // Stop pending timers on unmount so they don't set state afterwards.
  useEffect(() => {
    return () => {
      requestAbort.current?.abort();
    };
  }, []);

  function updateConfig(patch: Partial<AddPageConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  // Step 1 -> 2. Regenerating restarts from stage 1 and discards any preview,
  // since a new script invalidates the earlier sample.
  async function handleGenerate() {
    cancelAgents();
    const controller = new AbortController();
    requestAbort.current = controller;
    setStage(1);
    setScript("");
    setScriptFileName(null);
    setScriptStatus("writing");
    setPreviewStatus("idle");
    setPreviewLog([]);
    setPreviewPosts([]);
    setPreviewSnapshot(null);
    setPreviewPostCount(0);
    setErrorMessage("");
    setFeedPostError("");
    setApprovedPageId(null);

    try {
      const generated = await generateScraperScript(
        normalizeUrl(config.url.trim()),
        config.postsPerRun,
        controller.signal,
      );
      setScript(generated.script);
      setScriptFileName(generated.fileName);
      setScriptStatus("ready");
    } catch (error) {
      if (!controller.signal.aborted) {
        setScriptStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Fara script generation failed.",
        );
      }
    } finally {
      if (requestAbort.current === controller) requestAbort.current = null;
    }
  }

  // Step 3: run the generated repository script and show its real output.
  async function handleRunPreview() {
    if (!scriptFileName) return;
    cancelAgents();
    const controller = new AbortController();
    requestAbort.current = controller;
    setErrorMessage("");
    setPreviewPosts([]);
    setPreviewPostCount(0);
    setPreviewLog(["Starting the generated scraper…"]);
    setPreviewStatus("running");

    try {
      const result = await runScraperPreview(scriptFileName, controller.signal);
      const posts = result.snapshot.posts ?? [];
      setPreviewSnapshot(result.snapshot);
      setPreviewPosts(posts);
      setPreviewPostCount(result.snapshot.count ?? posts.length);
      setPreviewLog(
        result.standardOutput
          ? result.standardOutput.split(/\r?\n/).filter(Boolean)
          : [`Scraper completed with ${posts.length} posts.`],
      );
      setPreviewStatus("done");
    } catch (error) {
      if (!controller.signal.aborted) {
        const message =
          error instanceof Error ? error.message : "The scraper preview failed.";
        setErrorMessage(message);
        setPreviewSnapshot(null);
        setPreviewLog([message]);
        setPreviewStatus("error");
      }
    } finally {
      if (requestAbort.current === controller) requestAbort.current = null;
    }
  }

  async function handleStart() {
    if (
      !scriptFileName ||
      !previewSnapshot ||
      previewStatus !== "done" ||
      isApproving ||
      approvalInProgress.current
    ) {
      return;
    }
    approvalInProgress.current = true;
    cancelAgents();
    setIsApproving(true);
    setErrorMessage("");
    setFeedPostError("");
    let pageId = approvedPageId;
    try {
      if (!pageId) {
        const page = await onComplete({
          ...config,
          url: normalizeUrl(config.url.trim()),
          name: resolveName(config),
          description: config.description.trim(),
          script,
          scriptFileName,
        });
        pageId = page.id;
        setApprovedPageId(page.id);
      }
      await onPublishPreview(pageId, previewSnapshot);
      setShowApprovalConfirmation(false);
      navigate("/feed", {
        state: { approvalNotice: "Page approved and preview data posted to the feed." },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The approval request failed.";
      if (pageId) {
        setFeedPostError(message);
      } else {
        setErrorMessage(message);
      }
      return;
    } finally {
      approvalInProgress.current = false;
      setIsApproving(false);
    }
    // Reset so adding another page starts from a clean form.
    setConfig(INITIAL_CONFIG);
    setStage(0);
    setScript("");
    setScriptFileName(null);
    setScriptStatus("idle");
    setPreviewLog([]);
    setPreviewStatus("idle");
    setPreviewPosts([]);
    setPreviewSnapshot(null);
    setPreviewPostCount(0);
    setErrorMessage("");
    setFeedPostError("");
    setApprovedPageId(null);
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50 via-[#fffaf5] to-[#fffaf5] p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header>
          <h1 className="text-3xl font-extrabold text-stone-800">Add a page</h1>
          <p className="mt-1 max-w-[58ch] text-sm text-stone-400">
            Configure the page, review its script, inspect a preview, then approve it.
          </p>
        </header>

        <StageStepper stage={stage} />

        {errorMessage && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {errorMessage}
          </p>
        )}

        {stage === 0 && (
          <ConfigureStep
            config={config}
            onChange={updateConfig}
            tagSuggestions={existingTags}
            hasScript={scriptStatus !== "idle"}
            onGenerate={handleGenerate}
          />
        )}

        {stage === 1 && (
            <ScriptStep
              script={script}
              scriptFileName={scriptFileName}
              status={scriptStatus}
              onBack={() => setStage(0)}
              onContinue={() => setStage(2)}
            />
        )}

        {stage === 2 && (
            <PreviewStep
              pageName={resolveName(config)}
              includeImages={config.includeImages}
              posts={previewPosts}
              postCount={previewPostCount}
              log={previewLog}
              status={previewStatus}
              onBack={() => setStage(1)}
              onRunPreview={handleRunPreview}
              onContinue={() => {
                if (previewStatus === "done") setStage(3);
              }}
            />
        )}

        {stage === 3 && (
          <StagePanel step={4} title="Approve">
            <p className="text-sm text-stone-600">
              {approvedPageId ? (
                <>
                  <strong>{resolveName(config)}</strong> is approved. Its preview contains {previewPostCount} {previewPostCount === 1 ? "post" : "posts"}.
                </>
              ) : (
                <>
                  Approve <strong>{resolveName(config)}</strong> for monitoring?
                  The successful preview included {previewPostCount} {previewPostCount === 1 ? "post" : "posts"}.
                </>
              )}
            </p>
            {feedPostError && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                Page approved, but preview data failed to post to the feed: {feedPostError}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setStage(2)}
                disabled={isApproving || Boolean(approvedPageId)}
                className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back to preview
              </button>
              <button
                type="button"
                onClick={() => setShowApprovalConfirmation(true)}
                disabled={previewStatus !== "done" || !previewSnapshot || isApproving}
                className="h-11 rounded-xl bg-emerald-700 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {approvedPageId ? "Retry feed post" : "Approve"}
              </button>
            </div>
          </StagePanel>
        )}

        {showApprovalConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="approve-dialog-title"
              aria-describedby="approve-dialog-description"
              className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-2xl"
            >
              <h2 id="approve-dialog-title" className="text-lg font-semibold text-stone-800">
                {approvedPageId ? "Retry feed post" : "Confirm approval"}
              </h2>
              <p id="approve-dialog-description" className="mt-2 text-sm text-stone-600">
                {approvedPageId
                  ? "The page is approved, but its preview data was not posted to the feed. Retry posting the same preview?"
                  : "Are you sure you want to approve this page?"}
              </p>
              {feedPostError && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  Page approved, but feed posting failed: {feedPostError}
                </p>
              )}
              {errorMessage && (
                <p role="alert" className="mt-3 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowApprovalConfirmation(false)}
                  disabled={isApproving}
                  className="h-10 rounded-lg border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={isApproving || previewStatus !== "done" || !previewSnapshot}
                  className="h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isApproving
                    ? approvedPageId ? "Posting…" : "Approving…"
                    : approvedPageId ? "Retry feed post" : "Approve"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}