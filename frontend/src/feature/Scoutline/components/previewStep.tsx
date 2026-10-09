import StagePanel from "../../../common/stagePanel";
import { Tag } from "../../../common/tags";
import type { PreviewStatus } from "../constant/addPage";

type PreviewStepProps = {
  locked: boolean;
  pageName: string;
  includeImages: boolean;
  log: string[];
  status: PreviewStatus;
  onApprove: () => void;
  onRevise: () => void;
};

export default function PreviewStep({
  locked,
  pageName,
  includeImages,
  log,
  status,
  onApprove,
  onRevise,
}: PreviewStepProps) {
  return (
    <StagePanel step={3} title="Preview & approve" locked={locked}>
      <div
        role="log"
        className="mb-4 min-h-[110px] rounded-2xl bg-stone-900 p-3.5 font-mono text-xs leading-7 text-stone-200"
      >
        {log.map((line, i) => (
          <div key={i}>
            <span className="text-emerald-400">› </span>
            {line}
          </div>
        ))}
      </div>

      {/* Placeholder sample until the Scraper Agent returns a real post. */}
      {status === "done" && (
        <>
          <div className="mb-4 rounded-2xl border border-orange-100 p-4">
            <Tag
              label={`1 post · ${includeImages ? "2 images · " : ""}sample data`}
              variant="blue"
            />
            <h3 className="mt-2 text-base font-semibold text-stone-800">
              Sample post from {pageName}
            </h3>
            <p className="text-sm text-stone-500">
              Oct 5, 2026 · 128 reactions · Doors open Saturday at 8am with 40
              local stalls and live music.
            </p>
            {includeImages && (
              <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
                <div className="h-[105px] w-[150px] rounded-xl bg-gradient-to-br from-indigo-400 to-violet-600" />
                <div className="h-[105px] w-[150px] rounded-xl bg-gradient-to-br from-orange-400 to-rose-500" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onApprove}
              className="h-11 rounded-xl bg-orange-700 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800"
            >
              Looks right, start monitoring
            </button>
            <button
              type="button"
              onClick={onRevise}
              className="h-11 rounded-xl border border-stone-200 bg-white px-6 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
            >
              Not quite, revise
            </button>
          </div>
        </>
      )}
    </StagePanel>
  );
}