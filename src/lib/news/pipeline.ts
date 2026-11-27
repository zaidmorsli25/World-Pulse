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
  /** stories newly summarized in this run */
  published: number;
  /** stories whose reporting had not changed, so their briefing was kept */
  reused: number;
  /** stories left for the next run because of the time budget */
  deferred: number;
  /** stories live on the map after this run */
  live: number;
  rejected: { title: string; reason: string }[];
  updatedAt: string;
}

export interface IngestOptions {
  summarizer: Summarizer | null;
  now?: Date;
  maxEvents?: number;
  /** stop starting new briefings after this many ms (default WP_INGEST_BUDGET_SECONDS) */
  budgetMs?: number;
  /** briefings generated in parallel (default WP_INGEST_CONCURRENCY) */
  concurrency?: number;
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

/** A story that needs a (new) briefing. Serializable, so a run can be split across requests. */
export interface PendingCluster {
  id: string;
  articles: RawArticle[];
  countries: string[];
  latest: number;
}

/** First half of a run: fetch, cluster, keep unchanged briefings, and list stories needing a briefing. */
export interface PreparedRun {
  createdAt: string;
  maxEvents: number;
  report: IngestReport;
  all: RawArticle[];
  /** stories whose existing briefing is kept (with refreshed importance and sources) */
  reusedEvents: NewsEvent[];
  reusedQuizzes: Quiz[];
  articleEvent: [string, string][];
  /** most important first */
  todo: PendingCluster[];
}

export interface BuiltStory {
  clusterId: string;
  event: NewsEvent;
  quiz: Quiz;
}

const toCluster = (p: PendingCluster): Cluster => ({ articles: p.articles, countries: p.countries, latest: p.latest, tokens: new Set() });

export async function prepareIngestion(store: Store, opts: { now?: Date; maxEvents?: number; log?: (msg: string) => void } = {}): Promise<PreparedRun> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? (() => {});
  const report: IngestReport = { feeds: [], articles: 0, relevant: 0, clusters: 0, published: 0, reused: 0, deferred: 0, live: 0, rejected: [], updatedAt: now.toISOString() };
  const maxEvents = opts.maxEvents ?? NEWS.maxEvents;

  const feeds = configuredFeeds();
  const results = await Promise.allSettled(feeds.map(async (f) => ({ f, items: await fetchFeed(f) })));
  let all: RawArticle[] = [];
  feeds.forEach((f, i) => {
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

  // Rank clusters by a preliminary score (without AI signals); the most important come first.
  const ranked = clusters
    .map((c) => ({ c, pre: scoreImportance({ ...clusterSignals(c, now), consequences: 0.5, significance: 0.5, category: categorize(c.articles[0].headline) }).score }))
    .sort((a, b) => b.pre - a.pre)
    .slice(0, maxEvents);

  // Stories whose reporting has not substantially changed keep their existing briefing, so a
  // briefing is not rewritten every time one more article joins a story.
  const previous = (await store.getLiveNews()) ?? { events: [], quizzes: [], updatedAt: null };
  const prevQuiz = new Map(previous.quizzes.map((q) => [q.id, q]));
  const prevByUrl = new Map<string, NewsEvent>();
  for (const e of previous.events) for (const src of e.sources) if (src.url) prevByUrl.set(src.url, e);

  const reusedEvents: NewsEvent[] = [];
  const reusedQuizzes: Quiz[] = [];
  const articleEvent: [string, string][] = [];
  const todo: PendingCluster[] = [];
  for (const { c } of ranked) {
    const own = c.articles.filter((a) => !a.syndicatedFrom);
    const urls = own.map((a) => a.url);
    const counts = new Map<string, number>();
    for (const u of urls) {
      const id = prevByUrl.get(u)?.id;
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const [bestId, matched] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    const prev = bestId ? previous.events.find((e) => e.id === bestId) : undefined;
    const fresh = urls.length - matched;
    const briefingAgeHours = prev ? (now.getTime() - Date.parse(prev.updatedAt)) / 3600_000 : Infinity;
    // Keep the existing briefing unless the story has substantially grown, or it has new
    // reporting and the briefing is older than WP_NEWS_REWRITE_AFTER_HOURS.
    const keepBriefing = prev && matched / Math.max(1, urls.length) >= 0.5 && (fresh === 0 || briefingAgeHours < NEWS.rewriteAfterHours);
    const quiz = prev ? prevQuiz.get(prev.quizId) : undefined;
    if (prev && keepBriefing && quiz && !reusedEvents.some((e) => e.id === prev.id)) {
      const b = prev.importance.breakdown;
      const importance = b && typeof b.consequences === "number" && typeof b.significance === "number"
        ? scoreImportance({ ...clusterSignals(c, now), consequences: b.consequences, significance: b.significance, category: prev.category })
        : prev.importance;
      const known = new Set(prev.sources.map((src) => src.url));
      const sources = [
        ...prev.sources,
        ...own.filter((a) => !known.has(a.url)).map((a) => ({ id: a.id, publication: a.publication, headline: a.headline, url: a.url, publishedAt: a.publishedAt })),
      ].sort((x, y) => Date.parse(y.publishedAt) - Date.parse(x.publishedAt));
      reusedEvents.push({ ...prev, importance, sources });
      reusedQuizzes.push(quiz);
      for (const a of c.articles) articleEvent.push([a.id, prev.id]);
      report.reused++;
      continue;
    }
    todo.push({ id: `c-${stableId(urls.slice().sort().join("|"))}`, articles: c.articles, countries: c.countries, latest: c.latest });
  }
  return { createdAt: now.toISOString(), maxEvents, report, all, reusedEvents, reusedQuizzes, articleEvent, todo };
}

/** Turns a generated briefing for one pending story into a validated event, or a rejection reason. */
export function buildStory(p: PendingCluster, g: GeneratedBriefing, now: Date): BuiltStory | { reason: string } {
  const built = buildEvent(toCluster(p), g, now);
  return "reason" in built ? built : { clusterId: p.id, ...built };
}

/** Second half of a run: merge kept, new and still-recent earlier stories, and save. */
export async function finalizeIngestion(store: Store, run: PreparedRun, built: BuiltStory[], opts: { now?: Date; log?: (msg: string) => void } = {}): Promise<IngestReport> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? (() => {});
  const report = run.report;
  const cutoff = now.getTime() - NEWS.maxArticleAgeHours * 3600_000;
  const previous = (await store.getLiveNews()) ?? { events: [], quizzes: [], updatedAt: null };
  const prevQuiz = new Map(previous.quizzes.map((q) => [q.id, q]));
  const prevByUrl = new Map<string, NewsEvent>();
  for (const e of previous.events) for (const src of e.sources) if (src.url) prevByUrl.set(src.url, e);

  const events: NewsEvent[] = [];
  const quizzes: Quiz[] = [];
  const articleEvent = new Map(run.articleEvent);
  const usedPrev = new Set(run.reusedEvents.map((e) => e.id));
  const add = (event: NewsEvent, quiz: Quiz) => {
    if (events.some((e) => e.id === event.id)) return false;
    events.push(event);
    quizzes.push(quiz);
    return true;
  };
  run.reusedEvents.forEach((e) => {
    const q = run.reusedQuizzes.find((x) => x.id === e.quizId);
    if (q) add(e, q);
  });
  for (const b of built) {
    const p = run.todo.find((t) => t.id === b.clusterId);
    if (!p || !add(b.event, b.quiz)) continue;
    for (const a of p.articles) {
      articleEvent.set(a.id, b.event.id);
      const old = prevByUrl.get(a.url);
      if (old) usedPrev.add(old.id);
    }
    report.published++;
    log(`[ingest] published: ${b.event.title} (${b.event.importance.tier} ${b.event.importance.score})`);
  }
  // Keep earlier stories that are still recent and were not replaced by a newer briefing.
  for (const e of previous.events) {
    if (usedPrev.has(e.id) || events.some((x) => x.id === e.id)) continue;
    const latest = Math.max(...e.sources.map((src) => Date.parse(src.publishedAt)).filter(Number.isFinite), Date.parse(e.eventDate));
    if (latest < cutoff) continue;
    const quiz = prevQuiz.get(e.quizId);
    if (quiz) add(e, quiz);
  }
  events.sort((a, b) => b.importance.score - a.importance.score);
  const kept = events.slice(0, run.maxEvents);
  const keptIds = new Set(kept.map((e) => e.id));
  report.live = kept.length;
  report.updatedAt = now.toISOString();
  if (kept.length) {
    const news: LiveNews = { events: kept, quizzes: quizzes.filter((q) => keptIds.has(q.eventId)), updatedAt: now.toISOString() };
    await store.saveLiveNews(news, toStored(run.all, articleEvent, now));
  } else {
    await store.saveLiveNews(previous, toStored(run.all, articleEvent, now));
  }
  log(`[ingest] ${report.published} new, ${report.reused} unchanged, ${report.deferred} left for later, ${report.live} live`);
  return report;
}

/**
 * Complete run with the server's own summarizer (API-key mode). Without a summarizer, articles are
 * collected and kept stories refreshed, but no new briefings are written: in subscription mode a
 * scheduled Claude task writes them through /api/cron/candidates and /api/cron/publish instead.
 */
export async function runIngestion(store: Store, opts: IngestOptions): Promise<IngestReport> {
  const now = opts.now ?? new Date();
  const log = opts.log ?? (() => {});
  const run = await prepareIngestion(store, { now, maxEvents: opts.maxEvents, log });
  const report = run.report;
  const built: BuiltStory[] = [];
  const summarizer = opts.summarizer;
  if (!summarizer) {
    report.deferred = run.todo.length;
    return finalizeIngestion(store, run, built, { now, log });
  }
  const started = Date.now();
  const startBudget = opts.budgetMs ?? NEWS.ingestBudgetSeconds * 1000;
  const hardStop = started + startBudget + 75_000;
  let next = 0;
  const worker = async () => {
    while (next < run.todo.length) {
      if (Date.now() - started > startBudget) return;
      const p = run.todo[next++];
      const title = p.articles[0].headline;
      const limits = () => ({ timeout: Math.max(5_000, hardStop - Date.now()), maxRetries: 1 });
      try {
        const g = await summarizer.generate(p.articles, p.countries, limits());
        if (!g) {
          report.rejected.push({ title, reason: "model declined" });
          continue;
        }
        if (Date.now() > hardStop - 5_000) {
          report.deferred++;
          continue;
        }
        const v = await summarizer.verify(p.articles, g, limits());
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
        const story = buildStory(p, g, now);
        if ("reason" in story) report.rejected.push({ title, reason: story.reason });
        else built.push(story);
      } catch (e) {
        report.rejected.push({ title, reason: `error: ${(e as Error).message}` });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, opts.concurrency ?? NEWS.ingestConcurrency) }, worker));
  report.deferred += run.todo.length - Math.min(next, run.todo.length);
  return finalizeIngestion(store, run, built, { now, log });
}

function toStored(all: RawArticle[], articleEvent: Map<string, string>, now: Date): StoredArticle[] {
  return all.map((a) => ({ id: a.id, publication: a.publication, headline: a.headline, url: a.url, summary: a.summary, publishedAt: a.publishedAt, feed: a.feed, eventId: articleEvent.get(a.id) ?? null, fetchedAt: now.toISOString() }));
}
