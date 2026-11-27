import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildStory, finalizeIngestion, prepareIngestion, runIngestion } from "@/lib/news/pipeline";
import type { GeneratedBriefing } from "@/lib/news/summarize";
import type { Summarizer } from "@/lib/news/summarize";
import type { LiveNews, Store, StoredArticle } from "@/lib/server/store/types";
import type { NewsEvent, Quiz } from "@/lib/types";

const NOW = new Date("2026-11-26T12:00:00Z");
const URL1 = "https://www.bbc.co.uk/news/world-europe-1";

const rss = `<?xml version="1.0"?><rss version="2.0"><channel><title>BBC</title>
<item><title>France and Germany sign defence treaty at Paris summit</title><link>${URL1}</link>
<description>Leaders of France and Germany agreed a new defence pact on Tuesday.</description>
<pubDate>${new Date(NOW.getTime() - 3600_000).toUTCString()}</pubDate></item>
</channel></rss>`;

function memoryStore(initial: LiveNews | null) {
  const saved: { news: LiveNews; articles: StoredArticle[] }[] = [];
  const store = {
    kind: "local",
    getLiveNews: async () => initial,
    saveLiveNews: async (news: LiveNews, articles: StoredArticle[]) => {
      saved.push({ news, articles });
    },
  } as unknown as Store;
  return { store, saved };
}

const prevEvent: NewsEvent = {
  id: "ev-prev",
  title: "Earlier briefing",
  category: "diplomacy",
  countries: ["FRA", "DEU"],
  figures: [],
  location: { lat: 46, lng: 2 },
  region: "Europe",
  eventDate: new Date(NOW.getTime() - 3600_000).toISOString(),
  updatedAt: NOW.toISOString(),
  importance: { score: 50, tier: "significant", breakdown: { coverage: 0.2, prominence: 0.3, consequences: 0.6, recency: 1, significance: 0.6 } },
  isDemo: false,
  briefing: { whatHappened: [], background: [], whyItMatters: [], whatNext: [], involved: [], readingMinutes: 2 },
  sources: [{ id: "a1", publication: "BBC News", headline: "France and Germany sign defence treaty at Paris summit", url: URL1, publishedAt: new Date(NOW.getTime() - 3600_000).toISOString() }],
  quizId: "q-prev",
} as NewsEvent;
const prevQuiz = { id: "q-prev", eventId: "ev-prev", category: "diplomacy", questions: [] } as unknown as Quiz;

describe("incremental ingestion", () => {
  beforeEach(() => {
    vi.stubEnv("WP_FEEDS", JSON.stringify([{ publication: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml", section: "World" }]));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(rss, { status: 200 })));
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("keeps an existing briefing when its reporting has not changed, without calling the model", async () => {
    const generate = vi.fn();
    const { store, saved } = memoryStore({ events: [prevEvent], quizzes: [prevQuiz], updatedAt: null });
    const report = await runIngestion(store, { summarizer: { generate, verify: vi.fn() } as unknown as Summarizer, now: NOW });
    expect(report.clusters).toBe(1);
    expect(report.reused).toBe(1);
    expect(generate).not.toHaveBeenCalled();
    expect(saved.at(-1)?.news.events.map((e) => e.id)).toEqual(["ev-prev"]);
  });

  it("keeps a recent briefing when one more article joins the story", async () => {
    const rss2 = rss.replace("</channel>", `<item><title>France and Germany sign defence treaty at Paris summit as leaders meet</title><link>https://www.bbc.co.uk/news/world-europe-2</link>
<description>France and Germany agreed a defence pact at a Paris summit.</description><pubDate>${new Date(NOW.getTime() - 1800_000).toUTCString()}</pubDate></item></channel>`);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(rss2, { status: 200 })));
    const generate = vi.fn();
    const { store, saved } = memoryStore({ events: [prevEvent], quizzes: [prevQuiz], updatedAt: null });
    const report = await runIngestion(store, { summarizer: { generate, verify: vi.fn() } as unknown as Summarizer, now: NOW });
    expect(report.clusters).toBe(1);
    expect(report.reused).toBe(1);
    expect(generate).not.toHaveBeenCalled();
    expect(saved.at(-1)?.news.events[0].sources).toHaveLength(2);
  });

  it("leaves new stories for the next run when the time budget is spent, and keeps what is live", async () => {
    const generate = vi.fn();
    const old = { ...prevEvent, id: "ev-old", sources: [{ ...prevEvent.sources[0], url: "https://www.bbc.co.uk/news/other" }], quizId: "q-old" };
    const { store, saved } = memoryStore({ events: [old], quizzes: [{ ...prevQuiz, id: "q-old", eventId: "ev-old" }], updatedAt: null });
    const report = await runIngestion(store, { summarizer: { generate, verify: vi.fn() } as unknown as Summarizer, now: NOW, budgetMs: -1 });
    expect(generate).not.toHaveBeenCalled();
    expect(report.deferred).toBe(1);
    expect(saved.at(-1)?.news.events.map((e) => e.id)).toEqual(["ev-old"]);
  });

  it("publishes a briefing written outside the server (subscription mode) after validating it", async () => {
    const { store, saved } = memoryStore(null);
    const run = await prepareIngestion(store, { now: NOW });
    expect(run.todo).toHaveLength(1);
    const p = run.todo[0];
    const aid = p.articles[0].id;
    const claim = (text: string, sources: string[] = [aid]) => ({ text, kind: "fact" as const, sources });
    const g: GeneratedBriefing = {
      relevant: true,
      title: "France and Germany sign a defence treaty",
      category: "diplomacy",
      primaryCountry: "FRA",
      countries: ["FRA", "DEU"],
      figures: [],
      consequences: 0.6,
      significance: 0.6,
      whatHappened: [claim("France and Germany signed a new defence pact at a summit in Paris."), claim("This claim cites nothing it may cite.", ["not-an-article"])],
      background: [claim("France and Germany are the two largest economies in the European Union.", [])],
      involved: [{ name: "France", kind: "country", ref: "FRA", role: "Host of the Paris summit" }],
      whyItMatters: [claim("The pact deepens military cooperation between the two countries.", [])],
      whatNext: [],
      questions: [
        { type: "multiple_choice", prompt: "Where was the pact signed?", choices: ["Paris", "Berlin", "Rome"], answerIndex: 0, explanation: "It was signed at a summit in Paris.", context: "", countryIds: [], figureIds: [], evidence: "summit in Paris" },
        { type: "true_false", prompt: "The pact is about defence.", choices: ["True", "False"], answerIndex: 0, explanation: "It is a defence pact.", context: "", countryIds: [], figureIds: [], evidence: "new defence pact" },
        { type: "cause_effect", prompt: "What does the pact deepen?", choices: ["Military cooperation", "Trade tariffs", "Football rivalry"], answerIndex: 0, explanation: "It deepens military cooperation.", context: "", countryIds: [], figureIds: [], evidence: "deepens military cooperation" },
      ],
    };
    const story = buildStory(p, g, NOW);
    if ("reason" in story) throw new Error(story.reason);
    // Claims about the event must cite the story's own articles; the uncited one is dropped.
    expect(story.event.briefing.whatHappened).toHaveLength(1);
    const report = await finalizeIngestion(store, run, [story], { now: NOW });
    expect(report.published).toBe(1);
    expect(saved.at(-1)?.news.events[0].title).toBe("France and Germany sign a defence treaty");
    expect(saved.at(-1)?.articles.find((a) => a.id === aid)?.eventId).toBe(story.event.id);
  });

  it("rejects a briefing whose quiz is not taught by the briefing", async () => {
    const { store } = memoryStore(null);
    const run = await prepareIngestion(store, { now: NOW });
    const aid = run.todo[0].articles[0].id;
    const g = {
      relevant: true, title: "T", category: "diplomacy", primaryCountry: "FRA", countries: ["FRA"], figures: [], consequences: 0.5, significance: 0.5,
      whatHappened: [{ text: "France and Germany signed a pact.", kind: "fact", sources: [aid] }], background: [], involved: [], whyItMatters: [], whatNext: [],
      questions: [{ type: "multiple_choice", prompt: "Who won the cup?", choices: ["A", "B"], answerIndex: 0, explanation: "x", context: "", countryIds: [], figureIds: [], evidence: "won the cup" }],
    } as GeneratedBriefing;
    expect("reason" in buildStory(run.todo[0], g, NOW)).toBe(true);
  });
});
