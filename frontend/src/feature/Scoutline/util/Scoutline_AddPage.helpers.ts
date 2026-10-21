import type { AddPageConfig } from "../constant/addPage";

// Users often paste "facebook.com/page" without a protocol.
export const normalizeUrl = (url: string) =>
  /^https?:\/\//.test(url) ? url : `https://${url}`;

// Readable fallback name from the first path segment:
// ".../sunset-market" becomes "Sunset Market".
function nameFromUrl(url: string) {
  try {
    const parsed = new URL(url);
    const slug =
      parsed.pathname.split("/").filter(Boolean)[0] || parsed.hostname;
    return slug
      .replace(/[-_.]+/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "New page";
  }
}

// The display name is optional, so an empty one falls back to the URL.
export const resolveName = (config: AddPageConfig) =>
  config.name.trim() || nameFromUrl(normalizeUrl(config.url.trim()));

