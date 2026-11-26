import { timingSafeEqual } from "node:crypto";
import { sha256 } from "@/lib/server/crypto";
import { runIngestion } from "@/lib/news/pipeline";
import { Summarizer } from "@/lib/news/summarize";
import { invalidateContent } from "@/lib/server/content";
import { serverEnv } from "@/lib/server/env";
import { handler, HttpError, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const maxDuration = 300;

/**
 * Scheduled news refresh. Call with `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this
 * header automatically when CRON_SECRET is set). See vercel.json for the default hourly schedule.
 */
async function run(req: Request) {
  const given = Buffer.from(sha256(req.headers.get("authorization") ?? ""), "hex");
  const expected = Buffer.from(sha256(`Bearer ${serverEnv.cronSecret}`), "hex");
  if (!serverEnv.cronSecret || !timingSafeEqual(given, expected)) throw new HttpError(401, "Unauthorized.", "unauthorized");
  const summarizer = serverEnv.anthropicKey ? new Summarizer(serverEnv.anthropicKey, serverEnv.anthropicModel) : null;
  try {
    const report = await runIngestion(getStore(), { summarizer, log: console.info });
    invalidateContent();
    return json(report);
  } catch (e) {
    // Only the scheduler (which holds CRON_SECRET) can see this, so report the cause to make
    // failed runs diagnosable from its logs.
    const err = e as { message?: string; code?: string; details?: string; hint?: string };
    console.error("[ingest] failed", e);
    return json({ error: "Ingestion failed.", cause: [err.message, err.code, err.details, err.hint].filter(Boolean).join(" | ") || String(e) }, 500);
  }
}

export const GET = handler({ limit: 10 }, async ({ req }) => run(req));
export const POST = handler({ limit: 10 }, async ({ req }) => run(req));
