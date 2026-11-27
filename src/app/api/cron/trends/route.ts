import { z } from "zod";
import { urlBelongsTo } from "@/lib/news/sources";
import { getContent } from "@/lib/server/content";
import { requireCronSecret } from "@/lib/server/cronAuth";
import { handler, HttpError, json } from "@/lib/server/http";
import { loadTrends, saveTrends } from "@/lib/server/trends";
import { slugify, TREND_COLORS, TREND_RULES, trendProblems, type Trend, type TrendLink } from "@/lib/trends";
import { APPROVED_PUBLICATIONS, type NewsEvent } from "@/lib/types";

const Day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dates are YYYY-MM-DD");
const LinkIn = z.object({
  eventId: z.string().min(1),
  kind: z.enum(["direct", "ripple"]),
  label: z.string().min(2).max(28),
  note: z.string().min(10).max(240),
  source: z.object({ publication: z.enum(APPROVED_PUBLICATIONS), headline: z.string().min(5).max(300), url: z.string().url().max(1000) }),
});
const Timeline = z.array(z.object({ date: Day, text: z.string().min(5).max(240) })).max(40);
const Summary = z.array(z.string().min(20).max(900)).min(1).max(6);

const Op = z.discriminatedUnion("op", [
  z.object({ op: z.literal("create_draft"), name: z.string().min(4).max(60), cause: z.string().min(10).max(300), summary: Summary, timeline: Timeline.default([]), links: z.array(LinkIn).min(1).max(12) }),
  z.object({ op: z.literal("add_links"), id: z.string(), links: z.array(LinkIn).min(1).max(12), timeline: Timeline.default([]) }),
  z.object({ op: z.literal("remove_link"), id: z.string(), eventId: z.string() }),
  z.object({ op: z.literal("update"), id: z.string(), name: z.string().min(4).max(60).optional(), cause: z.string().min(10).max(300).optional(), summary: Summary.optional(), timeline: Timeline.optional() }),
  z.object({ op: z.literal("add_prediction"), id: z.string(), question: z.string().min(10).max(200), options: z.array(z.string().min(1).max(120)).min(2).max(4), closesAt: Day }),
  z.object({
    op: z.literal("resolve_prediction"),
    id: z.string(),
    predictionId: z.string(),
    answer: z.number().int().min(0),
    explanation: z.string().min(10).max(400),
    source: z.object({ publication: z.enum(APPROVED_PUBLICATIONS), headline: z.string().min(5).max(300), url: z.string().url().max(1000) }),
  }),
  z.object({ op: z.literal("approve"), id: z.string() }),
  z.object({ op: z.literal("reject"), id: z.string() }),
  z.object({ op: z.literal("retire"), id: z.string() }),
]);
const Body = z.object({ ops: z.array(Op).min(1).max(20) });

function toLink(l: z.infer<typeof LinkIn>, events: Map<string, NewsEvent>, at: string): TrendLink {
  const e = events.get(l.eventId);
  if (!e) throw new HttpError(400, `Story ${l.eventId} is not on the map now.`, "unknown_event");
  if (!urlBelongsTo(l.source.publication, l.source.url)) throw new HttpError(400, `The source for ${l.eventId} is not a link from ${l.source.publication}.`, "bad_source");
  return { ...l, addedAt: at, eventTitle: e.title, eventDate: e.eventDate, country: e.countries[0] ?? "" };
}

function mergeTimeline(t: Trend, add: { date: string; text: string }[]) {
  const seen = new Set(t.timeline.map((x) => `${x.date}|${x.text}`));
  for (const x of add) if (!seen.has(`${x.date}|${x.text}`)) t.timeline.push(x);
  t.timeline.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Trends, for the scheduled news task. GET lists every trend (drafts too), the rules and the
 * stories on the map now. POST applies operations; a draft reaches players only after zaid approves
 * it and a session sends `approve`.
 */
export const GET = handler({ limit: 20 }, async ({ req }) => {
  requireCronSecret(req);
  const [trends, c] = await Promise.all([loadTrends(), getContent()]);
  return json({
    rules: TREND_RULES,
    approvedPublications: APPROVED_PUBLICATIONS,
    trends: trends.map((t) => ({ ...t, problems: t.status === "retired" ? [] : trendProblems(t, trends) })),
    stories: c.events.map((e) => ({ id: e.id, title: e.title, date: e.eventDate, countries: e.countries, category: e.category, sources: e.sources.map((s) => ({ publication: s.publication, headline: s.headline, url: s.url })) })),
  });
});

export const POST = handler({ limit: 20, body: Body }, async ({ req, body }) => {
  requireCronSecret(req);
  const [trends, c] = await Promise.all([loadTrends(), getContent()]);
  const events = new Map(c.events.map((e) => [e.id, e]));
  const at = new Date().toISOString();
  const find = (id: string) => {
    const t = trends.find((x) => x.id === id);
    if (!t) throw new HttpError(404, `No trend ${id}.`, "not_found");
    return t;
  };
  const results: { op: string; id: string; status: string; problems: string[] }[] = [];
  for (const op of body.ops) {
    let t: Trend;
    switch (op.op) {
      case "create_draft": {
        let id = slugify(op.name) || "trend";
        while (trends.some((x) => x.id === id)) id = `${id}-2`;
        t = { id, name: op.name, color: "", status: "draft", cause: op.cause, summary: op.summary, timeline: [], links: [], createdAt: at, lastStoryAt: at };
        t.links = dedupe(op.links.map((l) => toLink(l, events, at)));
        mergeTimeline(t, op.timeline);
        trends.push(t);
        break;
      }
      case "add_links": {
        t = find(op.id);
        if (t.status === "retired") throw new HttpError(409, `${t.id} is retired.`, "retired");
        t.links = dedupe([...t.links, ...op.links.map((l) => toLink(l, events, at))]);
        mergeTimeline(t, op.timeline);
        t.lastStoryAt = at;
        break;
      }
      case "remove_link":
        t = find(op.id);
        t.links = t.links.filter((l) => l.eventId !== op.eventId);
        break;
      case "update":
        t = find(op.id);
        if (op.name) t.name = op.name;
        if (op.cause) t.cause = op.cause;
        if (op.summary) t.summary = op.summary;
        if (op.timeline) {
          t.timeline = [];
          mergeTimeline(t, op.timeline);
        }
        break;
      case "add_prediction": {
        t = find(op.id);
        if (t.status !== "active" && t.status !== "draft") throw new HttpError(409, `${t.id} is retired.`, "retired");
        if (op.closesAt <= at.slice(0, 10)) throw new HttpError(400, "closesAt must be a future day.", "bad_date");
        const open = (t.predictions ?? []).filter((x) => x.answer === undefined);
        if (open.length >= 3) throw new HttpError(409, `${t.id} already has 3 open predictions.`, "too_many");
        t.predictions = [...(t.predictions ?? []), { id: `p${(t.predictions?.length ?? 0) + 1}-${Date.now().toString(36)}`, question: op.question, options: op.options, closesAt: op.closesAt, createdAt: at }];
        break;
      }
      case "resolve_prediction": {
        t = find(op.id);
        const pr = t.predictions?.find((x) => x.id === op.predictionId);
        if (!pr) throw new HttpError(404, `No prediction ${op.predictionId} on ${t.id}.`, "not_found");
        if (pr.answer !== undefined) throw new HttpError(409, "Already resolved.", "resolved");
        if (op.answer >= pr.options.length) throw new HttpError(400, "answer is not one of the options.", "bad_answer");
        if (!urlBelongsTo(op.source.publication, op.source.url)) throw new HttpError(400, `The source is not a link from ${op.source.publication}.`, "bad_source");
        Object.assign(pr, { answer: op.answer, explanation: op.explanation, source: op.source, resolvedAt: at });
        break;
      }
      case "approve": {
        t = find(op.id);
        if (t.status !== "draft") throw new HttpError(409, `${t.id} is not a draft.`, "not_draft");
        const problems = trendProblems(t, trends);
        if (problems.length) throw new HttpError(409, `${t.id} cannot be approved: ${problems.join("; ")}`, "rules");
        const active = trends.filter((x) => x.status === "active");
        if (active.length >= TREND_RULES.maxActive) throw new HttpError(409, `Already ${active.length} active trends. Retire one first.`, "too_many");
        const used = new Set(active.map((x) => x.color));
        t.color = TREND_COLORS.find((col) => !used.has(col)) ?? TREND_COLORS[0];
        t.status = "active";
        t.approvedAt = at;
        t.lastStoryAt = at;
        break;
      }
      case "reject": {
        t = find(op.id);
        if (t.status !== "draft") throw new HttpError(409, `${t.id} is not a draft.`, "not_draft");
        trends.splice(trends.indexOf(t), 1);
        results.push({ op: op.op, id: t.id, status: "deleted", problems: [] });
        continue;
      }
      case "retire":
        t = find(op.id);
        t.status = "retired";
        t.retiredAt = at;
        break;
    }
    results.push({ op: op.op, id: t.id, status: t.status, problems: t.status === "retired" ? [] : trendProblems(t, trends) });
  }
  await saveTrends(trends);
  return json({ ok: true, results });
});

function dedupe(links: TrendLink[]): TrendLink[] {
  const m = new Map<string, TrendLink>();
  for (const l of links) m.set(l.eventId, l);
  return [...m.values()];
}
