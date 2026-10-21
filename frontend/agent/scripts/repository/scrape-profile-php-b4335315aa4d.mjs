import { chromium } from "playwright";
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";

// Run with:
// node scripts/scrape-facebook.mjs           # headless
// node scripts/scrape-facebook.mjs --headed  # watch the browser

const PAGE_URL = "https://www.facebook.com/profile.php?id=100094218363222";
const MAX_POSTS = 10;
const OUTPUT_FILE = "posts.json";
// Optional logged-in session. Logged-out visitors usually hit a login wall
// after a few posts; if this file exists, the browser reuses that session.
const STORAGE_STATE = "fb-session.json";

// Runs inside the browser, so it can't use anything from this file's scope:
// every helper has to be defined inside it.
function extractPosts() {
  const POST_LINK =
    /\/(posts|videos|reel|photos?|permalink)\b|story_fbid|pfbid/;
  const VIDEO_LINK = /\/(videos|reel|watch)\b/;

  // Strip Facebook's tracking params so the same post always gets the same URL.
  const cleanUrl = (href) => {
    const url = new URL(href, location.origin);
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith("__") || key === "comment_id") {
        url.searchParams.delete(key);
      }
    }
    return url.toString();
  };

  // Comments are also role="article" and nested inside posts. Keeping only
  // top-level articles stops comments from showing up as fake posts.
  const articles = Array.from(
    document.querySelectorAll('div[role="article"]'),
  ).filter((el) => !el.parentElement.closest('[role="article"]'));

  return articles.map((article) => {
    const links = Array.from(article.querySelectorAll("a[href]"));
    const postLink = links.find((a) => POST_LINK.test(a.getAttribute("href")));
    const videoLink = links.find((a) =>
      VIDEO_LINK.test(a.getAttribute("href")),
    );

    // Facebook marks the message container with a data-ad-* attribute. If
    // that changes, fall back to the longest text block in the post.
    const messageEl = article.querySelector(
      '[data-ad-comet-preview="message"], [data-ad-preview="message"]',
    );
    let description = messageEl ? messageEl.innerText.trim() : "";
    if (!description) {
      description =
        Array.from(article.querySelectorAll('div[dir="auto"]'))
          .map((el) => el.innerText.trim())
          .sort((a, b) => b.length - a.length)[0] ?? "";
    }

    const media = [];
    const seen = new Set();

    for (const img of article.querySelectorAll("img")) {
      const src = img.currentSrc || img.src;
      // Avatars, emoji and reaction icons are small; real post photos are not.
      const isPhoto =
        Math.max(img.naturalWidth, img.width) >= 200 &&
        Math.max(img.naturalHeight, img.height) >= 200;
      if (isPhoto && src && !seen.has(src)) {
        seen.add(src);
        media.push({ type: "image", url: src });
      }
    }

    // Facebook plays video from a blob: stream, so there is no real file URL
    // to save. The video's permalink and poster image are the usable parts.
    for (const video of article.querySelectorAll("video")) {
      media.push({
        type: "video",
        url: videoLink ? cleanUrl(videoLink.href) : null,
        poster: video.poster || null,
      });
    }

    return {
      url: postLink ? cleanUrl(postLink.href) : null,
      description,
      media,
    };
  });
}

// Facebook posts have no title field, so the title is the first sentence
// of the text, capped at 80 characters.
function toTitle(description) {
  const firstLine = description.split("\n").find((l) => l.trim()) ?? "";
  const firstSentence = firstLine.split(/(?<=[.!?])\s/)[0];
  if (!firstSentence) return "Untitled post";
  return firstSentence.length > 80
    ? `${firstSentence.slice(0, 77).trimEnd()}…`
    : firstSentence;
}

// The cookie banner and the "log in" dialog both block clicking and scrolling.
async function dismissOverlays(page) {
  const cookie = page
    .getByRole("button", { name: /allow all cookies|accept all/i })
    .first();
  if (await cookie.isVisible().catch(() => false)) {
    await cookie.click().catch(() => {});
  }
  const close = page.locator('div[role="dialog"] [aria-label="Close"]').first();
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => {});
  }
}

// Long posts are truncated behind "See more"; expand them before reading.
// Always clicking .first() works because a button disappears once clicked.
async function expandSeeMore(page) {
  const buttons = page.locator('div[role="article"] div[role="button"]', {
    hasText: /See more/i,
  });
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    await buttons
      .first()
      .click({ timeout: 1000 })
      .catch(() => {});
  }
}

const browser = await chromium.launch({
  headless: !process.argv.includes("--headed"),
});

try {
  const context = await browser.newContext({
    // English locale so the "See more" / "Close" labels match the selectors.
    locale: "en-US",
    viewport: { width: 1280, height: 1600 },
    ...(existsSync(STORAGE_STATE) ? { storageState: STORAGE_STATE } : {}),
  });
  const page = await context.newPage();

  await page.goto(PAGE_URL, { waitUntil: "domcontentloaded" });
  await page
    .waitForSelector('div[role="article"]', { timeout: 20000 })
    .catch(() => {
      throw new Error(
        "No posts found. Facebook may be showing a login wall or changed its markup. Try again with --headed to see the page.",
      );
    });

  // Facebook removes off-screen posts from the DOM as you scroll, so posts
  // are collected on every pass instead of once at the end. The Map keeps
  // first-seen (feed) order and drops duplicates.
  const collected = new Map();
  let stalls = 0;

  for (let i = 0; i < 20 && collected.size < MAX_POSTS && stalls < 3; i++) {
    await dismissOverlays(page);
    await expandSeeMore(page);

    const batch = await page.evaluate(extractPosts);
    const before = collected.size;
    for (const post of batch) {
      const key = post.url ?? post.description.slice(0, 80);
      if (key && !collected.has(key)) collected.set(key, post);
    }

    // Three passes with nothing new means the feed has ended or is blocked.
    stalls = collected.size === before ? stalls + 1 : 0;

    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(1500);
  }

  const posts = [...collected.values()].slice(0, MAX_POSTS).map((post) => ({
    url: post.url,
    title: toTitle(post.description),
    description: post.description,
    media: post.media,
  }));

  const snapshot = {
    source: PAGE_URL,
    scrapedAt: new Date().toISOString(),
    count: posts.length,
    posts,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(snapshot, null, 2));
  console.log(`Saved ${posts.length} posts to ${OUTPUT_FILE}`);
  if (posts.length < MAX_POSTS) {
    console.warn(
      `Only ${posts.length} of ${MAX_POSTS} posts were reachable. See the notes about the login wall.`,
    );
  }
} finally {
  await browser.close();
}
