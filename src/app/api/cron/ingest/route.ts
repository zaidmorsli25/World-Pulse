import { runIngestion } from "@/lib/news/pipeline";
import { Summarizer } from "@/lib/news/summarize";
import { invalidateContent } from "@/lib/server/content";
import { describeError, requireCronSecret } from "@/lib/server/cronAuth";
import { serverEnv } from "@/lib/server/env";
import { handler, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const maxDuration = 300;

/**
 * Optional API-key mode: a complete news run in which the server writes briefings itself with
 * ANTHROPIC_API_KEY. Without a key it only collects articles and refreshes kept stories; briefings
 * are then written by a scheduled Claude task through /api/cron/candidates and /api/cron/publish.
 */
async function run(req: Request) {
  requireCronSecret(req);
  const summarizer = serverEnv.anthropicKey ? new Summarizer(serverEnv.anthropicKey, serverEnv.anthropicModel) : null;
  try {
    const report = await runIngestion(getStore(), { summarizer, log: console.info });
    invalidateContent();
    return json(report);
  } catch (e) {
    console.error("[ingest] failed", e);
    return json({ error: "Ingestion failed.", cause: describeError(e) }, 500);
  }
}

export const GET = handler({ limit: 10 }, async ({ req }) => run(req));
export const POST = handler({ limit: 10 }, async ({ req }) => run(req));
