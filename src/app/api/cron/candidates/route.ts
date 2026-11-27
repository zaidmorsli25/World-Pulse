import { z } from "zod";
import countries from "@/data/generated/countries.json";
import { FIGURES } from "@/data/figures";
import { prepareIngestion, type PreparedRun } from "@/lib/news/pipeline";
import { BRIEFING_RULES, BriefingSchema } from "@/lib/news/summarize";
import { describeError, requireCronSecret } from "@/lib/server/cronAuth";
import { handler, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { APPROVED_PUBLICATIONS } from "@/lib/types";

export const maxDuration = 120;
import { PENDING_RUN_KEY } from "@/lib/server/newsRun";

const COUNTRY_NAME = new Map((countries as { id: string; name: string }[]).map((c) => [c.id, c.name]));

/**
 * Subscription mode, step 1. A scheduled Claude task calls this to get the stories that need a
 * briefing. The server fetches the approved feeds, clusters them, keeps briefings for unchanged
 * stories, and stores the run until the task sends the briefings to /api/cron/publish.
 */
export const GET = handler({ limit: 10 }, async ({ req }) => {
  requireCronSecret(req);
  const limit = Math.min(15, Math.max(1, Number(new URL(req.url).searchParams.get("limit")) || 8));
  try {
    const store = getStore();
    const run: PreparedRun = await prepareIngestion(store, { log: console.info });
    await store.setMeta(PENDING_RUN_KEY, run);
    return json({
      runId: run.createdAt,
      summary: {
        feeds: run.report.feeds.map((f) => ({ publication: f.publication, ok: f.ok, items: f.items, error: f.error })),
        articles: run.report.articles,
        stories: run.report.clusters,
        keptWithExistingBriefing: run.report.reused,
        needingBriefing: run.todo.length,
      },
      rules: BRIEFING_RULES,
      approvedPublications: APPROVED_PUBLICATIONS,
      briefingJsonSchema: z.toJSONSchema(BriefingSchema),
      figureDirectory: FIGURES.map((f) => ({ id: f.id, name: f.name, position: f.position })),
      // Most important first. Write briefings for as many as you can do well, in this order.
      stories: run.todo.slice(0, limit).map((s) => ({
        id: s.id,
        detectedCountries: s.countries.map((id) => ({ id, name: COUNTRY_NAME.get(id) ?? id })),
        articles: s.articles.map((a) => ({
          id: a.id,
          publication: a.publication,
          publishedAt: a.publishedAt,
          headline: a.headline,
          teaser: a.summary,
          url: a.url,
          wireCopyOf: a.syndicatedFrom,
        })),
      })),
    });
  } catch (e) {
    console.error("[candidates] failed", e);
    return json({ error: "Could not prepare the news run.", cause: describeError(e) }, 500);
  }
});
