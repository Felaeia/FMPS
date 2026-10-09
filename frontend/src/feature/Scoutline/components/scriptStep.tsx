import { useEffect, useRef } from "react";
import StagePanel from "../../../common/stagePanel";
import type { ScriptStatus } from "../constant/addPage";

const STATUS_TEXT: Record<ScriptStatus, string> = {
  idle: "Waiting for script…",
  writing: "Script Agent is writing…",
  ready: "Ready for your review. Edit freely.",
};

const STATUS_DOT: Record<ScriptStatus, string> = {
  idle: "bg-stone-300",
  writing: "animate-pulse bg-amber-500",
  ready: "bg-emerald-600",
};

type ScriptStepProps = {
  locked: boolean;
  script: string;
  onScriptChange: (script: string) => void;
  status: ScriptStatus;
  onApprove: () => void;
};

export default function ScriptStep({
  locked,
  script,
  onScriptChange,
  status,
  onApprove,
}: ScriptStepProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep the newest line in view while the agent is "typing".
  useEffect(() => {
    if (status === "writing" && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [script, status]);

  return (
    <StagePanel step={2} title="Review script" locked={locked}>
      <div className="overflow-hidden rounded-2xl border border-stone-700 bg-stone-900">
        <header className="flex items-center gap-1.5 border-b border-white/10 px-3.5 py-2 text-xs text-stone-300">
          <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-2 opacity-70">scout.config</span>
        </header>
        <textarea
          ref={textareaRef}
          value={script}
          // Read-only while the agent writes so the user's edits can't be
          // overwritten by the next chunk of text.
          readOnly={status === "writing"}
          onChange={(e) => onScriptChange(e.target.value)}
          spellCheck={false}
          aria-label="Generated script"
          className="h-56 w-full resize-none bg-transparent p-3.5 font-mono text-xs leading-relaxed text-stone-100 focus:outline-none"
        />
      </div>

      <p className="my-3 flex items-center gap-2 text-sm text-stone-400">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
        {STATUS_TEXT[status]}
      </p>

      <button
        type="button"
        onClick={onApprove}
        disabled={status !== "ready"}
        className="h-11 rounded-xl bg-orange-700 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Approve &amp; run preview
      </button>
    </StagePanel>
  );
}