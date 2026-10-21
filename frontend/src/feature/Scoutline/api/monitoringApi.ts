import type { Frequency, NewPageDraft } from "../constant/addPage";
import type { FeedPost } from "../util/Scoutline_Feed.helpers";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7022";

export type MonitoredPageRecord = {
  id: string;
  name: string;
  pageUrl: string;
  scriptFileName: string;
  frequency: Frequency;
  postsPerRun: number;
  includeImages: boolean;
  tags: string[];
  paused: boolean;
  isRunning: boolean;
  lastChecked: string | null;
  nextRunAt: string;
  lastError: string | null;
};

export type MonitoredPagePatch = Partial<
  Pick<MonitoredPageRecord, "frequency" | "postsPerRun" | "includeImages" | "tags" | "paused">
>;

type ApiFeedPost = {
  id: string;
  source: string;
  url: string | null;
  title: string;
  description: string;
  media: Array<{ type: string; url: string | null; poster?: string | null }>;
  createdAt: string;
  tags: string[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const getMonitoredPages = (signal?: AbortSignal) =>
  request<MonitoredPageRecord[]>("/api/scoutline/monitoring/pages", { signal });

export function createMonitoredPage(draft: NewPageDraft) {
  return request<MonitoredPageRecord>("/api/scoutline/monitoring/pages", {
    method: "POST",
    body: JSON.stringify({
      pageUrl: draft.url,
      name: draft.name,
      scriptFileName: draft.scriptFileName,
      frequency: draft.frequency,
      postsPerRun: draft.postsPerRun,
      includeImages: draft.includeImages,
      tags: draft.tags,
    }),
  });
}

export function updateMonitoredPage(id: string, patch: MonitoredPagePatch) {
  return request<MonitoredPageRecord>(
    `/api/scoutline/monitoring/pages/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  );
}

export function deleteMonitoredPage(id: string) {
  return request<void>(`/api/scoutline/monitoring/pages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function getFeedPosts(signal?: AbortSignal): Promise<FeedPost[]> {
  const posts = await request<ApiFeedPost[]>("/api/scoutline/monitoring/feed", { signal });
  return posts.map((post) => ({
    id: post.id,
    source: post.source,
    body: post.description || post.title,
    createdAt: post.createdAt,
    categories: post.tags,
    images: post.media
      .map((media) => media.type === "image" ? media.url : media.poster)
      .filter((url): url is string => Boolean(url)),
    url: post.url ?? undefined,
  }));
}