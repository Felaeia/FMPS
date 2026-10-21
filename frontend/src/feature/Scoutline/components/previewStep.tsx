import StagePanel from "../../../common/stagePanel";
import { Tag } from "../../../common/tags";
import type { PreviewStatus } from "../constant/addPage";
import type { ScrapedPost } from "../api/addPageApi";

type PreviewStepProps = {
  locked: boolean;
  pageName: string;
  includeImages: boolean;
  posts: ScrapedPost[];
  postCount: number;
  log: string[];
  status: PreviewStatus;
  onApprove: () => void;
  onRevise: () => void;
};

export default function PreviewStep({
  locked,
  pageName,
  includeImages,
  posts,
  postCount,
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
              {includeImages && posts[0].media.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {posts[0].media.map((item, index) => {
                    const src = item.type === "video" ? item.poster : item.url;
                    return src ? (
                      <img
                        key={`${src}-${index}`}
                        src={src}
                        alt="Post media"
                        className="h-[105px] w-[150px] rounded-xl object-cover"
                      />
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