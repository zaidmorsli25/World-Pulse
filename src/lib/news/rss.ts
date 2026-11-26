import { XMLParser } from "fast-xml-parser";
import type { Publication } from "../types";
import { urlBelongsTo, type FeedConfig } from "./sources";

export interface RawArticle {
  id: string;
  publication: Publication;
  headline: string;
  url: string;
  summary: string;
  publishedAt: string;
  feed: string;
  /** position in its feed (0 = top story) */
  rank: number;
  /** True when the item is a wire story republished by another outlet (not independent coverage). */
  syndicatedFrom: Publication | null;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: true, htmlEntities: true });

/** Strip tags/entities and collapse whitespace. Feed text is untrusted. */
export function cleanText(s: unknown, max = 600): string {
  const str = typeof s === "string" ? s : s && typeof s === "object" && "#text" in (s as object) ? String((s as { "#text": unknown })["#text"]) : "";
  return str
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function stableId(s: string): string {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Detects wire copy republished by another approved outlet, e.g. nytimes.com/reuters/... */
export function detectSyndication(publication: Publication, url: string, text: string): Publication | null {
  const u = url.toLowerCase();
  if (publication !== "Reuters" && (/\/reuters\//.test(u) || /^\(?reuters\)?\s*[-–—]/i.test(text))) return "Reuters";
  if (publication !== "Bloomberg" && (/\/bloomberg\//.test(u) || /^\(?bloomberg\)?\s*[-–—]/i.test(text))) return "Bloomberg";
  return null;
}

export function parseFeed(xml: string, feed: FeedConfig): RawArticle[] {
  const doc = parser.parse(xml);
  const items: unknown[] = [].concat(doc?.rss?.channel?.item ?? doc?.feed?.entry ?? []);
  const out: RawArticle[] = [];
  items.forEach((it, rank) => {
    const item = it as Record<string, unknown>;
    const link = typeof item.link === "string" ? item.link : ((item.link as Record<string, string>)?.["@_href"] ?? cleanText(item.guid));
    const url = cleanText(link, 1000);
    const headline = cleanText(item.title, 300);
    if (!headline || !url || !urlBelongsTo(feed.publication, url)) return;
    const date = new Date(cleanText(item.pubDate ?? item.published ?? item.updated ?? item["dc:date"]));
    if (Number.isNaN(date.getTime())) return;
    const summary = cleanText(item.description ?? item.summary ?? "", 500);
    out.push({
      id: stableId(url),
      publication: feed.publication,
      headline,
      url,
      summary,
      publishedAt: date.toISOString(),
      feed: `${feed.publication} · ${feed.section}`,
      rank,
      syndicatedFrom: detectSyndication(feed.publication, url, summary),
    });
  });
  return out;
}

export async function fetchFeed(feed: FeedConfig, timeoutMs = 12_000): Promise<RawArticle[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(feed.url, { signal: ctrl.signal, headers: { "User-Agent": "WorldPulseBot/0.1 (educational news game; RSS reader)", Accept: "application/rss+xml, application/xml, text/xml" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (text.length > 5_000_000) throw new Error("feed too large");
    return parseFeed(text, feed);
  } finally {
    clearTimeout(t);
  }
}
