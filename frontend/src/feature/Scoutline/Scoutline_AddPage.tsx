import { useEffect, useRef, useState } from "react";
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
  buildScript,
  normalizeUrl,
  resolveName,
} from "../Scoutline/util/Scoutline_AddPage.helpers";

type Props = {
  // Called when the user approves the preview. The parent adds the page to
  // the monitored list and navigates to it.
  onComplete: (draft: NewPageDraft) => void;
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
  const [scriptStatus, setScriptStatus] = useState<ScriptStatus>("idle");
  const [previewLog, setPreviewLog] = useState<string[]>([]);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>("idle");

  // Timers for the simulated agents. They live in refs so a new run, a
  // revision, or leaving the page can cancel ticks that haven't fired yet.
  const typingTimer = useRef<number | undefined>(undefined);
  const previewTimers = useRef<number[]>([]);

  function cancelAgents() {
    window.clearInterval(typingTimer.current);
    previewTimers.current.forEach((id) => window.clearTimeout(id));
    previewTimers.current = [];
  }

  // Stop pending timers on unmount so they don't set state afterwards.
  useEffect(() => {
    return () => {
      window.clearInterval(typingTimer.current);
      previewTimers.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  function updateConfig(patch: Partial<AddPageConfig>) {
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  // Step 1 -> 2. Regenerating restarts from stage 1 and discards any preview,
  // since a new script invalidates the earlier sample.
  function handleGenerate() {
    cancelAgents();
    const fullScript = buildScript(config);
    setStage(1);
    setScript("");
    setScriptStatus("writing");
    setPreviewStatus("idle");
    setPreviewLog([]);

    // Simulated Script Agent: reveal the script a few characters at a time.
    // Replace with the real agent call when the backend exists.
    let shown = 0;
    typingTimer.current = window.setInterval(() => {
      shown += 3;
      setScript(fullScript.slice(0, shown));
      if (shown >= fullScript.length) {
        window.clearInterval(typingTimer.current);
        setScriptStatus("ready");
      }
    }, 14);
  }

  // Step 2 -> 3: run the approved script once and show one sample post.
  function handleApproveScript() {
    cancelAgents();
    setStage(2);
    setPreviewLog([]);
    setPreviewStatus("running");

    // Simulated Scraper Agent log. Replace with the real preview run.
    const lines = [
      "Scraper Agent online",
      "Opening page…",
      "Running your approved script…",
      "Extracting 1 post…",
      ...(config.includeImages
        ? ["Found 2 images in post", "Downloading images…"]
        : []),
      "Done. Output ready for review",
    ];
    lines.forEach((line, i) => {
      previewTimers.current.push(
        window.setTimeout(
          () => setPreviewLog((prev) => [...prev, line]),
          i * 600,
        ),
      );
    });
    previewTimers.current.push(
      window.setTimeout(() => setPreviewStatus("done"), lines.length * 600 + 150),
    );
  }

  // "Not quite": back to configuration so the settings can be adjusted.
  function handleRevise() {
    cancelAgents();
    setStage(0);
    setPreviewStatus("idle");
    setPreviewLog([]);
  }

  function handleStart() {
    cancelAgents();
    onComplete({
      ...config,
      url: normalizeUrl(config.url.trim()),
      name: resolveName(config),
      description: config.description.trim(),
      script,
    });
    // Reset so adding another page starts from a clean form.
    setConfig(INITIAL_CONFIG);
    setStage(0);
    setScript("");
    setScriptStatus("idle");
    setPreviewLog([]);
    setPreviewStatus("idle");
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
              onScriptChange={setScript}
              status={scriptStatus}
              onApprove={handleApproveScript}
            />
            <PreviewStep
              locked={stage < 2}
              pageName={resolveName(config)}
              includeImages={config.includeImages}
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