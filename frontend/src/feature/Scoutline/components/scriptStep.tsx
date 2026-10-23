import { useEffect, useRef } from "react";
import StagePanel from "../../../common/stagePanel";
import type { ScriptStatus } from "../constant/addPage";

const STATUS_TEXT: Record<ScriptStatus, string> = {
  idle: "Waiting for script…",
  writing: "Fara is configuring the approved scraper template…",
  ready: "Ready for review. Only the page URL and post limit were customized.",
  error: "Fara could not generate the script.",
};

const STATUS_DOT: Record<ScriptStatus, string> = {
  idle: "bg-stone-300",
  writing: "animate-pulse bg-amber-500",
  ready: "bg-emerald-600",
  error: "bg-red-500",
};

type ScriptStepProps = {
  script: string;
  scriptDraftId: string | null;
  status: ScriptStatus;
  onBack: () => void;
  onContinue: () => void;
};

export default function ScriptStep({
  script,
  scriptDraftId,
  status,
  onBack,
  onContinue,
}: ScriptStepProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest line in view while the agent is "typing".
  useEffect(() => {
    if (status === "writing" && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [script, status]);

  return (
    <StagePanel step={2} title="Review script">
      <div className="overflow-hidden rounded-2xl border border-stone-700 bg-stone-900">
        <header className="flex items-center gap-1.5 border-b border-white/10 px-3.5 py-2 text-xs text-stone-300">
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 opacity-70">scrape-facebook.mjs · Fara template</span>
        </header>
        <textarea
          ref={textareaRef}
          value={script}
          // Keep the approved scraper structure intact; generation only
          // changes its page URL and post limit.
          readOnly
          spellCheck={false}
          aria-label="Generated script"
          className="h-56 w-full resize-none bg-transparent p-3.5 font-mono text-xs leading-relaxed text-stone-100 focus:outline-none"
        />
      </div>

      <p className="my-3 flex items-center gap-2 text-sm text-stone-400">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        {STATUS_TEXT[status]}
      </p>

      {scriptDraftId && (
        <p className="-mt-1 mb-3 break-all text-xs text-stone-500">
          Temporary script draft: {scriptDraftId}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={status !== "ready"}
          className="h-11 rounded-xl bg-orange-700 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to preview
        </button>
      </div>
    </StagePanel>
  );
}