import { z } from "zod";
import { buildStory, finalizeIngestion, type BuiltStory, type PendingCluster, type PreparedRun } from "@/lib/news/pipeline";
import { cleanText, stableId, type RawArticle } from "@/lib/news/rss";
import { urlBelongsTo } from "@/lib/news/sources";
import { BriefingSchema } from "@/lib/news/summarize";
import { invalidateContent } from "@/lib/server/content";
import { describeError, requireCronSecret } from "@/lib/server/cronAuth";
import { handler, HttpError, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";
import { APPROVED_PUBLICATIONS } from "@/lib/types";
import { PENDING_RUN_KEY } from "@/lib/server/newsRun";

export const maxDuration = 120;

const MAX_RUN_AGE_HOURS = 3;

const ExtraSource = z.object({
  publication: z.enum(APPROVED_PUBLICATIONS),
  headline: z.string().min(5).max(300),
  url: z.string().url().max(1000),
  publishedAt: z.string().refine((s) => Number.isFinite(Date.parse(s)), "publishedAt must be a date"),
  /** what this article reports, in the writer's own words; used as the article's teaser */
  summary: z.string().max(600).default(""),
});

const Body = z.object({
  runId: z.string(),
  briefings: z
    .array(
      z.object({
        id: z.string(),
        // Validated per story below, so one malformed briefing does not reject the others.
        briefing: z.unknown(),
        /** further reporting on the same event from the approved publications only */
        extraSources: z.array(z.unknown()).max(10).default([]),
      }),
    )
    .max(20),
});

/**
 * Subscription mode, step 2. The scheduled Claude task sends the briefings it wrote for the stories
 * from /api/cron/candidates. Each is validated (schema, approved sources only, every claim about
 * the event cited, quiz answers taught by the briefing) before it is published; stories without a
 * briefing are left for the next run.
 */
export const POST = handler({ limit: 10, body: Body }, async ({ req, body }) => {
  requireCronSecret(req);
  const store = getStore();
  const run = await store.getMeta<PreparedRun>(PENDING_RUN_KEY);
  if (!run || run.createdAt !== body.runId) throw new HttpError(409, "No matching news run. Fetch /api/cron/candidates again.", "stale_run");
  const now = new Date();
  if (now.getTime() - Date.parse(run.createdAt) > MAX_RUN_AGE_HOURS * 3600_000) throw new HttpError(409, "This news run is too old. Fetch /api/cron/candidates again.", "stale_run");

  const built: BuiltStory[] = [];
  const handled = new Set<string>();
  const notes: { id: string; title: string; result: string }[] = [];
  for (const b of body.briefings) {
    const p = run.todo.find((t) => t.id === b.id);
    if (!p || handled.has(p.id)) {
      notes.push({ id: b.id, title: "", result: "rejected: unknown or duplicate story id" });
      continue;
    }
    handled.add(p.id);
    const title = p.articles[0].headline;
    const parsed = BriefingSchema.safeParse(b.briefing);
    if (!parsed.success) {
      const reason = `briefing does not match the schema (${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")})`;
      run.report.rejected.push({ title, reason });
      notes.push({ id: p.id, title, result: `rejected: ${reason}` });
      continue;
    }
    // Extra reporting is accepted only from the six approved publications, on their own domains.
    const extras: RawArticle[] = [];
    const skipped: string[] = [];
    for (const raw of b.extraSources) {
      const x = ExtraSource.safeParse(raw);
      if (!x.success || !urlBelongsTo(x.data.publication, x.data.url)) {
        skipped.push(typeof raw === "object" && raw && "url" in raw ? String((raw as { url: unknown }).url) : "invalid source");
        continue;
      }
      if (p.articles.some((a) => a.url === x.data.url) || extras.some((a) => a.url === x.data.url)) continue;
      extras.push({
        id: stableId(x.data.url),
        publication: x.data.publication,
        headline: cleanText(x.data.headline, 300),
        url: x.data.url,
        summary: cleanText(x.data.summary, 600),
        publishedAt: new Date(x.data.publishedAt).toISOString(),
        feed: "research",
        rank: 50,
        syndicatedFrom: null,
      });
    }
    const story: PendingCluster = { ...p, articles: [...p.articles, ...extras] };
    const result = buildStory(story, parsed.data, now);
    if ("reason" in result) {
      run.report.rejected.push({ title, reason: result.reason });
      notes.push({ id: p.id, title, result: `rejected: ${result.reason}` });
      continue;
    }
    // Keep the added sources with the run so finalize links them to the event.
    run.todo = run.todo.map((t) => (t.id === p.id ? story : t));
    built.push(result);
    notes.push({ id: p.id, title: result.event.title, result: `published${skipped.length ? ` (ignored sources outside the approved list: ${skipped.join(", ")})` : ""}` });
  }
  run.report.deferred = run.todo.filter((t) => !handled.has(t.id)).length;
  try {
    const report = await finalizeIngestion(store, run, built, { now, log: console.info });
    await store.setMeta(PENDING_RUN_KEY, null);
    invalidateContent();
    return json({ ...report, stories: notes });
  } catch (e) {
    console.error("[publish] failed", e);
    return json({ error: "Publishing failed.", cause: describeError(e) }, 500);
  }
});
