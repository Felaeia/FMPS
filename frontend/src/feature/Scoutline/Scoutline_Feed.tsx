import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Play } from "lucide-react";
import { Card } from "../../common/card";
import { getFeedPosts } from "./api/monitoringApi";
import { useTheme } from "../../context/ThemeContext.types";
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

export default function Scoutline_Feed() {
  const location = useLocation();
  const { theme } = useTheme();
  const approvalNotice = (location.state as { approvalNotice?: string } | null)?.approvalNotice;
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
    <div className="theme-page min-h-screen w-full px-12 py-10 font-sans">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="theme-text-primary text-4xl font-extrabold">Feed</h1>
          <p className="theme-text-secondary mt-2 text-[15px]">
            {posts.length > 0
              ? getFeedSubtitle(posts.length, posts[0].createdAt)
              : "Posts collected from your monitored pages"}
          </p>
        </div>

        <span className="theme-surface inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-[#8DB89A]" />
          Auto-refreshing
        </span>
      </header>

      {approvalNotice && (
        <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {approvalNotice}
        </p>
      )}

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
                backgroundColor: isActive ? "#D95A2B" : theme === "dark" ? "#161D38" : "#FFFBF5",
                color: isActive ? "#FFFFFF" : theme === "dark" ? "#8E9AC0" : "#8C7A6B",
                border: `1px solid ${isActive ? "#D95A2B" : theme === "dark" ? "#273151" : "#E9E2D0"}`,
              }}
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
            <p className="theme-text-secondary text-sm">
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

              {post.media.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {post.media.map((media, index) => {
                    if (media.type === "video") {
                      const videoUrl = media.url ?? post.url;
                      const preview = (
                        <>
                          {media.poster ? (
                            <img
                              src={media.poster}
                              alt=""
                              className="h-[140px] w-[104px] rounded-xl object-cover"
                            />
                          ) : (
                            <div className="h-[140px] w-[104px] rounded-xl bg-stone-800" />
                          )}
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white">
                              <Play aria-hidden="true" className="h-4 w-4" fill="currentColor" />
                            </span>
                          </span>
                          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            VIDEO / REEL
                          </span>
                        </>
                      );

                      return videoUrl ? (
                        <a
                          key={`${post.id}-video-${index}`}
                          href={videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Watch video or reel from ${post.source}`}
                          title="Watch video or reel"
                          className="relative block overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
                        >
                          {preview}
                        </a>
                      ) : (
                        <div
                          key={`${post.id}-video-${index}`}
                          className="relative overflow-hidden rounded-xl"
                          aria-label="Video or reel preview"
                        >
                          {preview}
                        </div>
                      );
                    }

                    return media.url ? (
                      <img
                        key={`${post.id}-image-${index}`}
                        src={media.url}
                        alt=""
                        className="w-[104px] h-[72px] rounded-xl object-cover"
                      />
                    ) : null;
                  })}
                </div>
              )}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}