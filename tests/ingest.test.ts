import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runIngestion } from "@/lib/news/pipeline";
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
});
