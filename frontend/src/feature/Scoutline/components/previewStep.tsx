import StagePanel from "../../../common/stagePanel";
import { Tag } from "../../../common/tags";
import type { PreviewStatus } from "../constant/addPage";
import type { ScrapedPost } from "../api/addPageApi";

type PreviewStepProps = {
  pageName: string;
  includeImages: boolean;
  posts: ScrapedPost[];
  postCount: number;
  log: string[];
  status: PreviewStatus;
  onBack: () => void;
  onRunPreview: () => void;
  onContinue: () => void;
};

export default function PreviewStep({
  pageName,
  includeImages,
  posts,
  postCount,
  log,
  status,
  onBack,
  onRunPreview,
  onContinue,
}: PreviewStepProps) {
  return (
    <StagePanel step={3} title="Preview">
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

      {status === "done" && (
        <>
          {posts[0] ? (
            <article className="mb-4 rounded-2xl border border-orange-100 p-4">
              <Tag
                label={`${postCount} ${postCount === 1 ? "post" : "posts"} scraped · live preview`}
                variant="blue"
              />
              <h3 className="mt-2 text-base font-semibold text-stone-800">
                {posts[0].title || `Latest post from ${pageName}`}
              </h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-stone-500">
                {posts[0].description || "No post text was found."}
              </p>
              {posts[0].media.some((item) => item.type === "video" || includeImages) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {posts[0].media.filter((item) => item.type === "video" || includeImages).map((item, index) => {
                    const src = item.type === "video" ? item.poster : item.url;
                    return src ? (
                      <div key={`${src}-${index}`} className="relative">
                        <img
                          src={src}
                          alt={item.type === "video" ? "Video or reel preview" : "Post image"}
                          className="h-[105px] w-[150px] rounded-xl object-cover"
                        />
                        {item.type === "video" && (
                          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            VIDEO / REEL
                          </span>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
              {posts[0].url && (
                <a
                  href={posts[0].url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm font-medium text-orange-700 underline"
                >
                  Open post
                </a>
              )}
            </article>
          ) : (
            <p className="mb-4 rounded-2xl border border-orange-100 p-4 text-sm text-stone-500">
              The scraper completed, but no posts were available to preview.
            </p>
          )}

        </>
      )}

      {status === "error" && (
        <p role="alert" className="mb-4 text-sm text-red-700">
          The preview failed. Fix the issue and run the preview again before approving.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={status === "running"}
          className="h-11 rounded-xl border border-stone-200 bg-white px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onRunPreview}
          disabled={status === "running"}
          className="h-11 rounded-xl bg-orange-700 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "running" ? "Running preview…" : "Run preview"}
        </button>
        {status === "done" && (
          <button
            type="button"
            onClick={onContinue}
            className="h-11 rounded-xl border border-emerald-700 bg-emerald-700 px-6 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Continue to approve
          </button>
        )}
      </div>
    </StagePanel>
  );
}