/**
 * Groups articles about the same event and removes duplicates.
 *
 * 1. Exact duplicates (same URL, or the same headline from the same outlet) are dropped.
 * 2. Syndicated wire copies are attached to their original outlet and never counted as
 *    independent confirmation.
 * 3. Remaining articles are clustered greedily by headline/teaser similarity (Jaccard over
 *    content words), boosted when they mention the same countries and published within 48h.
 */
import type { Publication } from "../types";
import { detectCountries } from "./classify";
import type { RawArticle } from "./rss";

const STOP = new Set(
  "a an the of to in on for and or but with at by from as is are was were be been has have had it its this that these those after before over under into about amid says said new more than up out not no his her their they he she we you who what when why how will would could should can may might also just than then there here year years day week".split(
    " ",
  ),
);

export function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/'s$/, ""))
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface Cluster {
  articles: RawArticle[];
  countries: string[];
  tokens: Set<string>;
  latest: number;
}

export function dedupe(articles: RawArticle[]): RawArticle[] {
  const byUrl = new Map<string, RawArticle>();
  const seenHeadline = new Set<string>();
  for (const a of articles.sort((x, y) => x.rank - y.rank)) {
    const key = `${a.publication}|${a.headline.toLowerCase().replace(/\W+/g, " ").trim()}`;
    if (byUrl.has(a.url) || seenHeadline.has(key)) continue;
    byUrl.set(a.url, a);
    seenHeadline.add(key);
  }
  return [...byUrl.values()];
}

export function clusterArticles(articles: RawArticle[], threshold = 0.22): Cluster[] {
  const clusters: Cluster[] = [];
  const sorted = [...articles].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  for (const a of sorted) {
    const t = tokens(`${a.headline} ${a.summary}`);
    const cs = detectCountries(`${a.headline} ${a.summary}`);
    const time = Date.parse(a.publishedAt);
    let best: Cluster | null = null;
    let bestScore = 0;
    for (const c of clusters) {
      if (Math.abs(c.latest - time) > 48 * 3600_000) continue;
      const shared = cs.filter((x) => c.countries.includes(x)).length;
      const score = jaccard(t, c.tokens) + (shared ? 0.08 * Math.min(shared, 2) : 0);
      if (score > bestScore) {
        best = c;
        bestScore = score;
      }
    }
    if (best && bestScore >= threshold) {
      best.articles.push(a);
      for (const w of t) best.tokens.add(w);
      for (const x of cs) if (!best.countries.includes(x)) best.countries.push(x);
      best.latest = Math.max(best.latest, time);
    } else {
      clusters.push({ articles: [a], countries: cs, tokens: t, latest: time });
    }
  }
  return clusters;
}

/** Distinct approved outlets that independently reported the cluster (syndicated copies excluded). */
export function independentOutlets(c: Cluster): Publication[] {
  const set = new Set<Publication>();
  for (const a of c.articles) set.add(a.syndicatedFrom ?? a.publication);
  return [...set];
}
