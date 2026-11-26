/**
 * News ingestion pipeline:
 *   fetch approved feeds → filter → dedupe → cluster → score → summarize (AI) → verify → validate → store
 */
import countries from "@/data/generated/countries.json";
import { FIGURE_IDS } from "@/data/figures";
import { NEWS } from "../config";
import type { Category, Involved, NewsEvent, Quiz, Region } from "../types";
import type { LiveNews, Store, StoredArticle } from "../server/store/types";
import { categorize, detectFigures, relevance } from "./classify";
import { clusterArticles, dedupe, independentOutlets, type Cluster } from "./cluster";
import { scoreImportance } from "./importance";
import { fetchFeed, stableId, type RawArticle } from "./rss";
import { configuredFeeds } from "./sources";
import { Summarizer, type GeneratedBriefing } from "./summarize";
import { briefingText, COUNTRY_IDS, sanitizeClaims, validateQuiz } from "./validate";

type CountryRec = { id: string; region: string | null; latlng: number[] | null };
const COUNTRY = new Map((countries as CountryRec[]).map((c) => [c.id, c]));

export interface IngestReport {
  feeds: { publication: string; url: string; ok: boolean; items: number; error?: string }[];
  articles: number;
  relevant: number;
  clusters: number;
  published: number;
  rejected: { title: string; reason: string }[];
  updatedAt: string;
}

export interface IngestOptions {
  summarizer: Summarizer | null;
  now?: Date;
  maxEvents?: number;
  log?: (msg: string) => void;
}

function clusterSignals(c: Cluster, now: Date) {
  return {
    outlets: independentOutlets(c).length,
    articles: c.articles.filter((a) => !a.syndicatedFrom).length,
    topStories: c.articles.filter((a) => a.rank < 3).length,
    ageHours: (now.getTime() - c.latest) / 3600_000,
  };
}

/** Builds an event from a validated AI briefing. Returns null with a reason when it fails validation. */
export function buildEvent(c: Cluster, g: GeneratedBriefing, now: Date): { event: NewsEvent; quiz: Quiz } | { reason: string } {
  if (!g.relevant) return { reason: "not geopolitically relevant" };
  const ids = new Set(c.articles.map((a) => a.id));
  const whatHappened = sanitizeClaims(g.whatHappened, ids, true);
  if (!whatHappened.length) return { reason: "no supported claims about the event" };
  const briefing = {
    whatHappened,
    background: sanitizeClaims(g.background, ids, false),
    whyItMatters: sanitizeClaims(g.whyItMatters, ids, false),
    whatNext: sanitizeClaims(g.whatNext, ids, false),
    involved: g.involved
      .filter((i) => i.name.trim())
      .map((i): Involved => {
        const ref = i.kind === "country" && COUNTRY_IDS.has(i.ref) ? i.ref : i.kind === "figure" && FIGURE_IDS.has(i.ref) ? i.ref : undefined;
        return { name: i.name.slice(0, 120), kind: i.kind === "figure" && !ref ? "group" : i.kind, ref, role: i.role.slice(0, 160) };
      }),
    readingMinutes: 2,
  };
  const text = briefingText(briefing);
  const { valid, issues } = validateQuiz(
    g.questions.map((q) => ({
      ...q,
      countryIds: q.type === "map" || q.type === "country_id" ? q.countryIds : undefined,
      figureIds: q.type === "figure_id" ? q.figureIds : undefined,
    })),
    text,
  );
  if (valid.length < 3) return { reason: `quiz failed validation (${issues.map((i) => i.problem).join("; ")})` };
  const words = text.split(/\s+/).length;
  briefing.readingMinutes = Math.max(1, Math.round(words / 150));

  const countryIds = [g.primaryCountry, ...g.countries, ...c.countries].filter((x, i, a) => COUNTRY_IDS.has(x) && a.indexOf(x) === i);
  if (!countryIds.length) return { reason: "no identifiable country" };
  const primary = COUNTRY.get(countryIds[0])!;
  const figures = [...new Set([...g.figures, ...detectFigures(c.articles.map((a) => a.headline + " " + a.summary).join(" "))])].filter((f) => FIGURE_IDS.has(f));
  const signals = clusterSignals(c, now);
  const importance = scoreImportance({ ...signals, consequences: g.consequences, significance: g.significance, category: g.category as Category });
  const id = `ev-${stableId([...c.articles.map((a) => a.url)].sort().join("|"))}`;
  const quizId = `${id}-q${stableId(JSON.stringify(valid))}`;
  const eventDate = new Date(Math.min(...c.articles.map((a) => Date.parse(a.publishedAt)))).toISOString();
  const event: NewsEvent = {
    id,
    title: g.title.slice(0, 160),
    category: g.category as Category,
    countries: countryIds,
    figures,
    location: { lat: primary.latlng?.[0] ?? 0, lng: primary.latlng?.[1] ?? 0 },
    region: (primary.region ?? "Europe") as Region,
    eventDate,
    updatedAt: now.toISOString(),
    importance,
    isDemo: false,
    briefing,
    sources: c.articles
      .filter((a) => !a.syndicatedFrom)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .map((a) => ({ id: a.id, publication: a.publication, headline: a.headline, url: a.url, publishedAt: a.publishedAt })),
    quizId,
  };
  return { event, quiz: { id: quizId, eventId: id, category: event.category, questions: valid.map((q, i) => ({ ...q, id: `${quizId}-${i}` })) } };
}

export async function runIngestion(store: Store, opts: IngestOptions): Promise<IngestReport> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? (() => {});
  const report: IngestReport = { feeds: [], articles: 0, relevant: 0, clusters: 0, published: 0, rejected: [], updatedAt: now.toISOString() };

  const results = await Promise.allSettled(configuredFeeds().map(async (f) => ({ f, items: await fetchFeed(f) })));
  let all: RawArticle[] = [];
  configuredFeeds().forEach((f, i) => {
    const r = results[i];
    if (r.status === "fulfilled") {
      all.push(...r.value.items);
      report.feeds.push({ publication: f.publication, url: f.url, ok: true, items: r.value.items.length });
    } else report.feeds.push({ publication: f.publication, url: f.url, ok: false, items: 0, error: String(r.reason?.message ?? r.reason) });
  });
  const cutoff = now.getTime() - NEWS.maxArticleAgeHours * 3600_000;
  all = dedupe(all.filter((a) => Date.parse(a.publishedAt) >= cutoff));
  report.articles = all.length;
  const relevantArticles = all.filter((a) => relevance(`${a.headline} ${a.summary}`) >= 0.45);
  report.relevant = relevantArticles.length;
  const clusters = clusterArticles(relevantArticles);
  report.clusters = clusters.length;
  log(`[ingest] ${all.length} articles, ${relevantArticles.length} relevant, ${clusters.length} clusters`);

  if (!opts.summarizer) {
    log("[ingest] ANTHROPIC_API_KEY not set: articles were collected but no briefings were generated.");
    await store.saveLiveNews((await store.getLiveNews()) ?? { events: [], quizzes: [], updatedAt: null }, toStored(all, new Map(), now));
    return report;
  }

  // Rank clusters by a preliminary score (without AI signals) and summarize the most important.
  const ranked = clusters
    .map((c) => ({ c, pre: scoreImportance({ ...clusterSignals(c, now), consequences: 0.5, significance: 0.5, category: categorize(c.articles[0].headline) }).score }))
    .sort((a, b) => b.pre - a.pre)
    .slice(0, opts.maxEvents ?? NEWS.maxEvents);

  const events: NewsEvent[] = [];
  const quizzes: Quiz[] = [];
  const articleEvent = new Map<string, string>();
  for (const { c } of ranked) {
    const title = c.articles[0].headline;
    try {
      const g = await opts.summarizer.generate(c.articles, c.countries);
      if (!g) {
        report.rejected.push({ title, reason: "model declined" });
        continue;
      }
      const v = await opts.summarizer.verify(c.articles, g);
      if (v) {
        const verdict = new Map(v.claims.map((x) => [x.id, x.verdict]));
        const keep = (prefix: string, allowBackground: boolean) => (_: unknown, i: number) => {
          const vd = verdict.get(`${prefix}${i}`);
          return vd === "supported" || (allowBackground && vd === "established_background") || vd === undefined;
        };
        g.whatHappened = g.whatHappened.filter(keep("wh", false));
        g.background = g.background.filter(keep("bg", true));
        g.whyItMatters = g.whyItMatters.filter(keep("wm", true));
        g.whatNext = g.whatNext.filter(keep("wn", true));
        const badQ = new Set(v.questions.filter((q) => !q.valid).map((q) => q.index));
        g.questions = g.questions.filter((_, i) => !badQ.has(i));
      }
      const built = buildEvent(c, g, now);
      if ("reason" in built) {
        report.rejected.push({ title, reason: built.reason });
        continue;
      }
      events.push(built.event);
      quizzes.push(built.quiz);
      for (const a of c.articles) articleEvent.set(a.id, built.event.id);
      log(`[ingest] published: ${built.event.title} (${built.event.importance.tier} ${built.event.importance.score})`);
    } catch (e) {
      report.rejected.push({ title, reason: `error: ${(e as Error).message}` });
    }
  }
  report.published = events.length;
  if (events.length) {
    const news: LiveNews = { events: events.sort((a, b) => b.importance.score - a.importance.score), quizzes, updatedAt: now.toISOString() };
    await store.saveLiveNews(news, toStored(all, articleEvent, now));
  }
  return report;
}

function toStored(all: RawArticle[], articleEvent: Map<string, string>, now: Date): StoredArticle[] {
  return all.map((a) => ({ id: a.id, publication: a.publication, headline: a.headline, url: a.url, summary: a.summary, publishedAt: a.publishedAt, feed: a.feed, eventId: articleEvent.get(a.id) ?? null, fetchedAt: now.toISOString() }));
}
