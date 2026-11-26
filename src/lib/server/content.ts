import "server-only";
import { buildDemoContent } from "@/data/demo/events";
import type { NewsEvent, PublicQuiz, Quiz } from "@/lib/types";
import { serverEnv } from "./env";
import { getStore } from "./store";

export interface Content {
  mode: "live" | "demo";
  events: NewsEvent[];
  quizzes: Map<string, Quiz>;
  updatedAt: string | null;
}

let cache: { at: number; content: Content } | null = null;
const TTL = 60_000;

/** Live news when the ingestion pipeline has produced events, otherwise clearly labelled demo content. */
export async function getContent(): Promise<Content> {
  if (cache && Date.now() - cache.at < TTL) return cache.content;
  let content: Content | null = null;
  if (serverEnv.newsMode !== "demo") {
    try {
      const live = await getStore().getLiveNews();
      if (live && live.events.length) content = { mode: "live", events: live.events, quizzes: new Map(live.quizzes.map((q) => [q.id, q])), updatedAt: live.updatedAt };
    } catch (e) {
      console.error("[content] could not load live news", e);
    }
  }
  if (!content && serverEnv.newsMode === "live") content = { mode: "live", events: [], quizzes: new Map(), updatedAt: null };
  if (!content) {
    // Anchor demo timestamps to the hour so they stay stable between requests.
    const anchor = new Date(Math.floor(Date.now() / 3600_000) * 3600_000);
    const demo = buildDemoContent(anchor);
    content = { mode: "demo", events: demo.events, quizzes: new Map(demo.quizzes.map((q) => [q.id, q])), updatedAt: anchor.toISOString() };
  }
  cache = { at: Date.now(), content };
  return content;
}

export const invalidateContent = () => {
  cache = null;
};

export function toPublicQuiz(q: Quiz): PublicQuiz {
  return {
    id: q.id,
    eventId: q.eventId,
    questions: q.questions.map(({ id, type, prompt, choices, countryIds, figureIds }) => ({ id, type, prompt, choices, countryIds, figureIds })),
  };
}
