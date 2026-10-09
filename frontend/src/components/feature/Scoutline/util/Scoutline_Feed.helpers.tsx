

// ---------- Types ----------

import type { TagProps, TagVariant } from "../../../common/tags";

// Single source of truth for the categories. The filter chips, the post data
// and the tag colors all derive from this list, so adding a category means
// editing here (and giving it a color below) and nothing else.
export const FEED_CATEGORIES = [
  "Events",
  "Local",
  "Announcements",
  "Promos",
] as const;
export type FeedCategory = (typeof FEED_CATEGORIES)[number];

// "All" is a filter-only value, not a category a post can have, so it is kept
// out of FeedCategory. The chip row renders directly from FEED_FILTERS.
export const FEED_FILTERS = ["All", ...FEED_CATEGORIES] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

export interface FeedPost {
  id: string;
  source: string; // e.g. "City Hall Updates"; also drives the avatar
  body: string;
  createdAt: string; // ISO date string, turned into "just now" / "5m ago" below
  categories: FeedCategory[];
  images?: string[];
}

// ---------- Category -> tag color ----------

// Typed as Record<FeedCategory, ...> so TypeScript errors if a category is
// added above without a color being chosen here.
const CATEGORY_VARIANT: Record<FeedCategory, TagVariant> = {
  Announcements: "teal",
  Local: "rose",
  Promos: "green",
  Events: "blue",
};

// Converts a category into the props the common <Tag /> expects, so a post's
// tags are just `post.categories.map(getCategoryTagProps)`.
export const getCategoryTagProps = (category: FeedCategory): TagProps => ({
  label: category,
  variant: CATEGORY_VARIANT[category],
});

// ---------- Filtering ----------

// "All" returns everything; any other chip keeps posts that carry that category.
// A post can have several categories, which is why this uses includes()
// instead of an equality check.
export const filterPosts = (
  posts: FeedPost[],
  filter: FeedFilter
): FeedPost[] =>
  filter === "All"
    ? posts
    : posts.filter((post) => post.categories.includes(filter));

// ---------- Time and subtitle text ----------

// Short relative time for the card header. `now` is a parameter (defaulting to
// the current time) so the function stays pure and easy to test.
export const formatRelativeTime = (
  isoDate: string,
  now: number = Date.now()
): string => {
  const then = new Date(isoDate).getTime();
  // An unparseable date renders nothing instead of "NaNd ago".
  if (Number.isNaN(then)) return "";

  // Clamp at 0 so a timestamp slightly in the future (clock drift between
  // client and server) still reads "just now".
  const seconds = Math.max(0, Math.floor((now - then) / 1000));

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  // Past a week, an exact date is more useful than "23d ago".
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

// Builds the line under the "Feed" title: "65 posts · just updated".
// Reuses formatRelativeTime so both places agree on what counts as "just now".
export const getFeedSubtitle = (
  count: number,
  lastUpdated: string,
  now: number = Date.now()
): string => {
  const relative = formatRelativeTime(lastUpdated, now);
  const updated = relative === "just now" ? "just updated" : `updated ${relative}`;
  return `${count} ${count === 1 ? "post" : "posts"} · ${updated}`;
};

// ---------- Avatar ----------

// Full class strings (not concatenated) so Tailwind can generate them.
// The first entry matches the orange-olive avatar in the design.
const AVATAR_GRADIENTS = [
  "from-[#D95A2B] to-[#C9A82B]",
  "from-[#A8E03A] to-[#5CB82E]",
  "from-[#4FB3D9] to-[#3A6FD9]",
  "from-[#E0709A] to-[#C2415C]",
] as const;

// Picks a gradient from the source name. It is deterministic, so "City Hall
// Updates" always gets the same color on every render and every page load,
// without storing a color on each post.
export const getAvatarGradient = (source: string): string => {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash += source.charCodeAt(i);
  }
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
};