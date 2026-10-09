import { useState } from "react";
import { Card } from "../../../components/common/card";
import {
  FEED_FILTERS,
  filterPosts,
  formatRelativeTime,
  getAvatarGradient,
  getCategoryTagProps,
  getFeedSubtitle,
  type FeedFilter,
  type FeedPost,
} from "../Scoutline/util/Scoutline_Feed.helpers";

// Temporary data matching the design. Replace with a fetch (same
// loading/AbortController pattern the starter page used) once the feed API
// exists. An empty string in `images` renders the placeholder tile, so real
// image URLs can be dropped in later without changing the page.
const MOCK_POSTS: FeedPost[] = [
  {
    id: "1",
    source: "City Hall Updates",
    body: "Council meeting moved to Thursday 6pm",
    createdAt: new Date().toISOString(),
    categories: ["Announcements", "Local"],
  },
  {
    id: "2",
    source: "Northwind Coffee",
    body: "Autumn blend is here: buy one, get one Friday",
    createdAt: new Date().toISOString(),
    categories: ["Promos"],
    images: ["", ""],
  },
  {
    id: "3",
    source: "Harbor Collective",
    body: "Weekend market is back at the harbor",
    createdAt: new Date().toISOString(),
    categories: ["Events", "Local"],
    images: ["", ""],
  },
];

// Stand-in for the time the feed was last refreshed; the real value will come
// from the API response.
const MOCK_LAST_UPDATED = new Date().toISOString();

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
  const posts = MOCK_POSTS;
  const [filter, setFilter] = useState<FeedFilter>("All");

  // Derived on every render instead of stored in state, so the list can never
  // get out of sync with the selected chip.
  const visiblePosts = filterPosts(posts, filter);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#FDEBDD] via-[#FEF6EC] to-[#FFFBF5] px-12 py-10 font-sans">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-extrabold text-[#3E2A20]">Feed</h1>
          {/* Uses the full post count, not visiblePosts, so the number
              describes the feed rather than the active filter. */}
          <p className="mt-2 text-[15px] text-[#8C7A6B]">
            {getFeedSubtitle(posts.length, MOCK_LAST_UPDATED)}
          </p>
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E9E2D0] text-xs text-[#8C7A6B]">
          <span className="w-2 h-2 rounded-full bg-[#8DB89A]" />
          Live
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
        {/* A category can have zero posts, so show a message instead of a
            blank area that looks like the page failed to load. */}
        {visiblePosts.length === 0 ? (
          <p className="text-sm text-[#8C7A6B]">
            No posts in this category yet.
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