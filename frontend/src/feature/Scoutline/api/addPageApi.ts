const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7022";

export type GeneratedScraperScript = {
  fileName: string;
  script: string;
};

export type ScrapedPost = {
  url: string | null;
  title: string;
  description: string;
  media: Array<{
    type: "image" | "video";
    url: string | null;
    poster?: string | null;
  }>;
};

export type ScraperSnapshot = {
  source: string;
  scrapedAt: string;
  count: number;
  posts: ScrapedPost[];
};

export type ScraperPreview = {
  snapshot: ScraperSnapshot;
  standardOutput: string;
  standardError: string;
};

async function post<T>(path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const message = await response.text();
    let detail = message;
    try {
      const parsed = JSON.parse(message) as { detail?: string; title?: string };
      detail = parsed.detail ?? parsed.title ?? message;
    } catch {
      // The API returned plain text, so show that response directly.
    }
    throw new Error(detail || `Request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export function generateScraperScript(
  pageUrl: string,
  maxPosts: number,
  signal?: AbortSignal,
) {
  return post<GeneratedScraperScript>(
    "/api/scoutline/scripts/generate",
    { pageUrl, maxPosts },
    signal,
  );
}

export function runScraperPreview(fileName: string, signal?: AbortSignal) {
  return post<ScraperPreview>(
    "/api/scoutline/scripts/preview",
    { fileName },
    signal,
  );
}
