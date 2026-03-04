// server/trendRadar.ts
// No paid APIs. Uses public RSS sources + lightweight matching.
// Goal: give the engine "something real" to react to without burning credits.

export type TrendSource = "google_trends" | "google_news";
export type TrendTopic = {
  term: string;
  source: TrendSource;
  url?: string;
  score: number; // 0..100
  tags?: string[];
};

let cache: { at: number; topics: TrendTopic[] } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hour

function nowMs() {
  return Date.now();
}

function normalize(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

// Very small RSS parser (good enough for these feeds)
function extractRssItems(xml: string): { title: string; link?: string }[] {
  const items: { title: string; link?: string }[] = [];
  const itemBlocks = xml.split("<item>").slice(1);
  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i);
    const linkMatch = block.match(/<link>(.*?)<\/link>/i);
    const title = (titleMatch?.[1] || titleMatch?.[2] || "").trim();
    const link = (linkMatch?.[1] || "").trim();
    if (title) items.push({ title, link });
  }
  return items;
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "social-os-tracker/1.0",
      "accept": "application/rss+xml,application/xml,text/xml,text/plain,*/*",
    },
  });
  if (!res.ok) throw new Error(`Trend fetch failed ${res.status} for ${url}`);
  return await res.text();
}

async function googleTrendsDailyUS(): Promise<TrendTopic[]> {
  // Public RSS
  const url = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US";
  const xml = await fetchText(url);
  const items = extractRssItems(xml);

  // Titles often look like: "Some Topic"
  const topics: TrendTopic[] = items.slice(0, 30).map((it, idx) => ({
    term: it.title,
    source: "google_trends",
    url: it.link,
    score: Math.max(10, 100 - idx * 2),
    tags: ["trending"],
  }));

  return topics;
}

async function googleNewsDIY(): Promise<TrendTopic[]> {
  // DIY-adjacent query; change later per niche
  const url =
    "https://news.google.com/rss/search?q=(DIY%20OR%20home%20improvement%20OR%20renovation%20OR%20landscaping)%20when:7d&hl=en-US&gl=US&ceid=US:en";
  const xml = await fetchText(url);
  const items = extractRssItems(xml);

  const topics: TrendTopic[] = items.slice(0, 25).map((it, idx) => ({
    term: it.title,
    source: "google_news",
    url: it.link,
    score: Math.max(10, 80 - idx * 2),
    tags: ["news"],
  }));

  return topics;
}

export async function getTrendingTopics(): Promise<TrendTopic[]> {
  if (cache && nowMs() - cache.at < TTL_MS) return cache.topics;

  const out: TrendTopic[] = [];
  try {
    out.push(...(await googleTrendsDailyUS()));
  } catch {
    // swallow — we can still operate without it
  }
  try {
    out.push(...(await googleNewsDIY()));
  } catch {}

  // Normalize + de-dupe by term
  const seen = new Set<string>();
  const cleaned: TrendTopic[] = [];
  for (const t of out) {
    const key = normalize(t.term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    cleaned.push(t);
  }

  cache = { at: nowMs(), topics: cleaned };
  return cleaned;
}

export type TrendMatch = {
  term: string;
  source: TrendSource;
  score: number;
  reason: string;
  url?: string;
};

// Lightweight matching: keyword overlap between video text and trend term
export function matchTrends(
  videoText: string,
  topics: TrendTopic[],
  maxMatches = 3
): TrendMatch[] {
  const text = normalize(videoText);
  if (!text) return [];

  const matches: TrendMatch[] = [];

  for (const t of topics) {
    const term = normalize(t.term);
    if (!term) continue;

    // Require at least one strong overlap word (>=5 chars)
    const termWords = uniq(term.split(" ").filter(w => w.length >= 5));
    const hits = termWords.filter(w => text.includes(w)).length;
    if (hits <= 0) continue;

    const boost = Math.min(25, hits * 10);
    const score = Math.min(100, t.score + boost);

    matches.push({
      term: t.term,
      source: t.source,
      score,
      url: t.url,
      reason: `Matches trending term via ${hits} keyword overlap word(s).`,
    });
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, maxMatches);
}
