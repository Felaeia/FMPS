import { useEffect, useState } from "react";
import { Card } from "../../common/card";
import { getFeedPosts } from "./api/monitoringApi";
import {
  FEED_FILTERS,
  filterPosts,
  formatRelativeTime,
  getAvatarGradient,
  getCategoryTagProps,
  getFeedSubtitle,
  type FeedFilter,
  type FeedPost,
} from "./util/Scoutline_Feed.helpers";

// Tile shown while a post has no real image yet. Fixed size so the row doesn't
// jump when real images (rendered at the same size) replace it.
const ImagePlaceholder = () => (
  <div className="relative w-[104px] h-[72px] rounded-xl overflow-hidden bg-gradient-to-br from-[#E0B040] to-[#9CC83A]">
    <svg
      viewBox="0 0 104 72"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      <circle cx="82" cy="16" r="8" fill="#FFFFFF" fillOpacity="0.45" />
      <path
        d="M0 72 L30 34 L50 56 L68 30 L104 72 Z"
        fill="#FFFFFF"
        fillOpacity="0.35"
      />
    </svg>
  </div>
);

export default function Scoutline_Feed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<FeedFilter>("All");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const refresh = async () => {
      try {
        const fetchedPosts = await getFeedPosts(controller.signal);
        if (active) {
          setPosts(fetchedPosts);
          setLoadError("");
        }
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setLoadError(error instanceof Error ? error.message : "Could not load the feed.");
        }
      }
    };
    void refresh();
    const intervalId = window.setInterval(() => void refresh(), 15_000);
    return () => {
      active = false;
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  // Derived on every render instead of stored in state, so the list can never
  // get out of sync with the selected chip.
  const visiblePosts = filterPosts(posts, filter);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#FDEBDD] via-[#FEF6EC] to-[#FFFBF5] px-12 py-10 font-sans">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#3E2A20]">Feed</h1>
          <p className="mt-2 text-[15px] text-[#8C7A6B]">
            {posts.length > 0
              ? getFeedSubtitle(posts.length, posts[0].createdAt)
              : "Posts collected from your monitored pages"}
          </p>
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E9E2D0] text-xs text-[#8C7A6B]">
          <span className="w-2 h-2 rounded-full bg-[#8DB89A]" />
          Auto-refreshing
        </span>
      </header>

      <nav
        className="mt-6 flex flex-wrap gap-2"
        aria-label="Filter posts by category"
      >
        {FEED_FILTERS.map((option) => {
          const isActive = option === filter;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={isActive}
              onClick={() => setFilter(option)}
              // Geometry and colors are inline for the same reason as the
              // sidebar slider: a global `button` rule in the project's CSS
              // overrides Tailwind utilities on buttons.
              style={{
                padding: "6px 14px",
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                backgroundColor: isActive ? "#D95A2B" : "#FFFFFF",
                color: isActive ? "#FFFFFF" : "#8C7A6B",
                border: `1px solid ${isActive ? "#D95A2B" : "#E9E2D0"}`,
              }}
              className="transition-colors duration-200"
            >
              {option}
            </button>
          );
        })}
      </nav>

      <section className="mt-6 flex flex-col gap-4" aria-label="Posts">
        {loadError && (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        )}
        {/* A category can have zero posts, so show a message instead of a
            blank area that looks like the page failed to load. */}
        {visiblePosts.length === 0 ? (
            <p className="text-sm text-[#8C7A6B]">
            {posts.length === 0 ? "No posts collected yet. Start monitoring a page to populate your feed." : "No posts in this category yet."}
          </p>
        ) : (
          visiblePosts.map((post) => (
            <Card
              key={post.id}
              title={post.source}
              timestamp={formatRelativeTime(post.createdAt)}
              tags={post.categories.map(getCategoryTagProps)}
              avatarGradient={getAvatarGradient(post.source)}
            >
              <p>{post.body}</p>
              {post.url && (
                <a href={post.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-orange-700 underline">
                  View original post
                </a>
              )}

              {/* Images sit between the body and the tags, so they go in the
                  Card's children rather than a separate Card prop. */}
              {post.images && post.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.images.map((src, index) =>
                    src ? (
                      <img
                        key={`${post.id}-${index}`}
                        src={src}
                        alt=""
                        className="w-[104px] h-[72px] rounded-xl object-cover"
                      />
                    ) : (
                      <ImagePlaceholder key={`${post.id}-${index}`} />
                    )
                  )}
                </div>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}