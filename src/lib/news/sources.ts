/**
 * Approved news sources. WorldPulse uses ONLY these six publications for current events.
 *
 * Access methods: the publishers' public RSS feeds (headline, link, date and a short teaser),
 * which they provide for this kind of syndication. WorldPulse stores only that metadata and links
 * readers to the original article; it never scrapes article pages or bypasses paywalls.
 * Check each publisher's RSS terms before commercial use; licensed APIs (e.g. Reuters Connect,
 * Dow Jones Factiva, Bloomberg Enterprise) can be plugged in through WP_FEEDS.
 *
 * Reuters discontinued its public RSS feeds, so it is only used when a licensed feed URL is
 * provided via REUTERS_FEED_URL. If a source is unavailable, ingestion continues with the others;
 * no other publication is ever substituted.
 */
import type { Publication } from "../types";

export interface FeedConfig {
  publication: Publication;
  url: string;
  section: string;
}

/** Hostnames each publication's article links must belong to. Links elsewhere are discarded. */
export const PUBLICATION_DOMAINS: Record<Publication, string[]> = {
  Bloomberg: ["bloomberg.com"],
  "BBC News": ["bbc.co.uk", "bbc.com"],
  "The Wall Street Journal": ["wsj.com"],
  Reuters: ["reuters.com"],
  NPR: ["npr.org"],
  "The New York Times": ["nytimes.com"],
};

export const DEFAULT_FEEDS: FeedConfig[] = [
  { publication: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", section: "World" },
  { publication: "BBC News", url: "https://feeds.bbci.co.uk/news/business/rss.xml", section: "Business" },
  { publication: "NPR", url: "https://feeds.npr.org/1004/rss.xml", section: "World" },
  { publication: "NPR", url: "https://feeds.npr.org/1014/rss.xml", section: "Politics" },
  { publication: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", section: "World" },
  { publication: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml", section: "Economy" },
  { publication: "The Wall Street Journal", url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews", section: "World" },
  { publication: "The Wall Street Journal", url: "https://feeds.content.dowjones.io/public/rss/socialeconomyfeed", section: "Economy" },
  { publication: "Bloomberg", url: "https://feeds.bloomberg.com/politics/news.rss", section: "Politics" },
  { publication: "Bloomberg", url: "https://feeds.bloomberg.com/economics/news.rss", section: "Economics" },
];

export function configuredFeeds(env: Record<string, string | undefined> = process.env): FeedConfig[] {
  let feeds = DEFAULT_FEEDS;
  if (env.WP_FEEDS) {
    try {
      const parsed = JSON.parse(env.WP_FEEDS) as FeedConfig[];
      feeds = parsed.filter((f) => f && typeof f.url === "string" && f.publication in PUBLICATION_DOMAINS);
    } catch {
      console.warn("[news] WP_FEEDS is not valid JSON; using defaults");
    }
  }
  if (env.REUTERS_FEED_URL) feeds = [...feeds, { publication: "Reuters", url: env.REUTERS_FEED_URL, section: "World" }];
  const disabled = new Set((env.WP_DISABLED_PUBLICATIONS ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  return feeds.filter((f) => !disabled.has(f.publication));
}

export function urlBelongsTo(publication: Publication, url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return PUBLICATION_DOMAINS[publication].some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}
