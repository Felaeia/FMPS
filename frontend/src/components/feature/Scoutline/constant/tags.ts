import type { TagVariant } from "../../../common/tags";

export const TAG_VARIANTS: Record<string, TagVariant> = {
  events: "blue",
  local: "rose",
  announcements: "teal",
  promos: "green",
};

// Unknown (user-typed) tags fall back to Tag's default variant.
export const variantFor = (label: string): TagVariant =>
  TAG_VARIANTS[label.toLowerCase()] ?? "teal";

// Colors per category, matching the Feed page's filter chips. Unknown
// (user-typed) tags fall back to a neutral style.
export const TAG_STYLES: Record<string, string> = {
  Events: "bg-blue-100 text-blue-700",
  Local: "bg-pink-100 text-pink-700",
  Announcements: "bg-teal-100 text-teal-700",
  Promos: "bg-green-100 text-green-700",
};
export const DEFAULT_TAG_STYLE = "bg-stone-100 text-stone-600";