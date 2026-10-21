import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfigureStep from "./components/configureStep";
import ScriptStep from "./components/scriptStep";
import PreviewStep from "./components/previewStep";
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
  type ScrapedPost,
} from "./api/addPageApi";

type Props = {
  // Called when the user approves the preview. The parent adds the page to
  // the monitored list and navigates to it.
  onComplete: (draft: NewPageDraft) => Promise<void>;
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
  const [previewPostCount, setPreviewPostCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  // Abort network work if the user starts over or leaves the flow.
  const requestAbort = useRef<AbortController | null>(null);

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
    setPreviewPostCount(0);
    setErrorMessage("");

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

  // Step 2 -> 3: run the approved repository script and show its real output.
  async function handleApproveScript() {
    if (!scriptFileName) return;
    cancelAgents();
    const controller = new AbortController();
    requestAbort.current = controller;
    setStage(2);
    setErrorMessage("");
    setPreviewPosts([]);
    setPreviewPostCount(0);
    setPreviewLog(["Starting the generated scraper…"]);
    setPreviewStatus("running");

    try {
      const result = await runScraperPreview(scriptFileName, controller.signal);
      const posts = result.snapshot.posts ?? [];
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
        setPreviewLog([message]);
        setPreviewStatus("error");
      }
    } finally {
      if (requestAbort.current === controller) requestAbort.current = null;
    }
  }

  // "Not quite": back to configuration so the settings can be adjusted.
  function handleRevise() {
    cancelAgents();
    setStage(0);
    setPreviewStatus("idle");
    setPreviewLog([]);
    setErrorMessage("");
  }

  async function handleStart() {
    cancelAgents();
    if (!scriptFileName) return;
    setErrorMessage("");
    try {
      await onComplete({
        ...config,
        url: normalizeUrl(config.url.trim()),
        name: resolveName(config),
        description: config.description.trim(),
        script,
        scriptFileName,
      });
      navigate("/monitored");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not start monitoring this page.");
      return;
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
    setPreviewPostCount(0);
    setErrorMessage("");
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-orange-50 via-[#fffaf5] to-[#fffaf5] p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header>
          <h1 className="text-3xl font-extrabold text-stone-800">Add a page</h1>
          <p className="mt-1 max-w-[58ch] text-sm text-stone-400">
            Configure, review the AI-written script, approve a one-post
            preview, then start monitoring. All on this screen.
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

        <div className="grid items-start gap-5 lg:grid-cols-[5fr_6fr]">
          <ConfigureStep
            config={config}
            onChange={updateConfig}
            tagSuggestions={existingTags}
            hasScript={scriptStatus !== "idle"}
            onGenerate={handleGenerate}
          />

          <div className="flex flex-col gap-5">
            <ScriptStep
              locked={stage < 1}
              script={script}
              scriptFileName={scriptFileName}
              status={scriptStatus}
              onApprove={handleApproveScript}
            />
            <PreviewStep
              locked={stage < 2}
              pageName={resolveName(config)}
              includeImages={config.includeImages}
              posts={previewPosts}
              postCount={previewPostCount}
              log={previewLog}
              status={previewStatus}
              onApprove={handleStart}
              onRevise={handleRevise}
            />
          </div>
        </div>
      </div>
    </div>
  );
}