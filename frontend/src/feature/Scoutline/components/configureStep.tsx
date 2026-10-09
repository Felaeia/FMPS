import type { ReactNode } from "react";
import Toggle from "../../../common/toggle";
import SegmentedControl from "../../../common/segmentedControl";
import StagePanel from "../../../common/stagePanel";
import TagEditor from "./tagEditor";
import { FREQUENCIES, type AddPageConfig } from "../constant/addPage";

const LABEL =
  "text-[11px] font-semibold uppercase tracking-wider text-stone-400";
const INPUT =
  "w-full rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2.5 text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-300";

// Label + control. Without htmlFor the label is a plain span, for controls
// (segmented, tags) that have no single input to associate with.
function Field({
  label,
  htmlFor,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={LABEL}>
          {label}
        </label>
      ) : (
        <span className={LABEL}>{label}</span>
      )}
      {children}
    </div>
  );
}

type ConfigureStepProps = {
  config: AddPageConfig;
  onChange: (patch: Partial<AddPageConfig>) => void;
  tagSuggestions: string[];
  // True once a script exists, so the button offers to redo it.
  hasScript: boolean;
  onGenerate: () => void;
};

export default function ConfigureStep({
  config,
  onChange,
  tagSuggestions,
  hasScript,
  onGenerate,
}: ConfigureStepProps) {
  // Both fields are inputs to the Script Agent, so generating is blocked
  // until they are filled in.
  const canGenerate =
    config.url.trim() !== "" && config.description.trim() !== "";

  return (
    <StagePanel step={1} title="Configure">
      <Field label="Page link" htmlFor="add-url">
        <input
          id="add-url"
          type="text"
          value={config.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://www.facebook.com/yourpage"
          className={INPUT}
        />
      </Field>

      <Field label="Display name (optional)" htmlFor="add-name">
        <input
          id="add-name"
          type="text"
          value={config.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Auto-filled from the link"
          className={INPUT}
        />
      </Field>

      <Field label="What to scrape" htmlFor="add-desc">
        <textarea
          id="add-desc"
          rows={2}
          value={config.description}
          onChange={(e) => onChange({ description: e.target.value })}
          className={`${INPUT} resize-none`}
        />
      </Field>

      <div className="mb-4">
        <Toggle
          checked={config.includeImages}
          onChange={(includeImages) => onChange({ includeImages })}
          label="Include images from each post"
        />
      </div>

      <Field label="Check frequency">
        <SegmentedControl
          ariaLabel="Check frequency"
          options={FREQUENCIES}
          value={config.frequency}
          onChange={(frequency) => onChange({ frequency })}
        />
      </Field>

      <Field
        label={
          <>
            Posts per run:{" "}
            <b className="text-stone-700">{config.postsPerRun}</b>
          </>
        }
        htmlFor="add-limit"
      >
        <input
          id="add-limit"
          type="range"
          min={1}
          max={10}
          value={config.postsPerRun}
          onChange={(e) => onChange({ postsPerRun: Number(e.target.value) })}
          className="accent-orange-700"
        />
      </Field>

      <Field label="Tags">
        <TagEditor
          tags={config.tags}
          onChange={(tags) => onChange({ tags })}
          suggestions={tagSuggestions}
        />
      </Field>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!canGenerate}
        className="h-11 rounded-xl bg-orange-700 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {hasScript ? "Regenerate script" : "Generate script →"}
      </button>
    </StagePanel>
  );
}