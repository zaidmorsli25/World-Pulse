// Trends: larger stories that link several map events through one named cause.
// Shared by the server (storage, validation, the hourly news task) and the client (map, HQ books).
import type { NewsEvent, Publication } from "./types";

export const TREND_RULES = {
  /** a trend needs at least this many current stories… */
  minStories: 3,
  /** …in at least this many different countries */
  minCountries: 2,
  maxActive: 6,
  /** a story may belong to at most this many trends */
  maxTrendsPerStory: 2,
  /** a trend with no new story for this long retires to "Past trends" */
  retireAfterDays: 14,
} as const;

/** Distinct, high-contrast thread colors that read on both land and sea. */
export const TREND_COLORS = ["#ff4d8d", "#00c2d1", "#ffb020", "#9b6bff", "#7ddc1f", "#ff7a1a", "#3d8bff", "#e83f3f"];

export type LinkKind = "direct" | "ripple";

export interface TrendLink {
  eventId: string;
  /** direct: the cause acts on this story itself. ripple: a knock-on effect. */
  kind: LinkKind;
  /** a short thread label, e.g. "Fuel prices" (shown on the map) */
  label: string;
  /** one sentence: how this story connects to the trend */
  note: string;
  /** the approved-outlet article that states the connection */
  source: { publication: Publication | "Demo"; headline: string; url: string | null };
  addedAt: string;
  /** snapshot so the trend's book still reads well after the story leaves the map */
  eventTitle: string;
  eventDate: string;
  country: string;
}

export interface TimelineEntry {
  date: string; // YYYY-MM-DD
  text: string;
}

/** A "what happens next" question for players, checked later against what actually happened. */
export interface TrendPrediction {
  id: string;
  question: string;
  options: string[];
  /** last day players can answer (YYYY-MM-DD) */
  closesAt: string;
  createdAt: string;
  /** index of what actually happened; set once the reporting settles it */
  answer?: number;
  /** one or two sentences on what happened, shown after it is resolved */
  explanation?: string;
  resolvedAt?: string;
  source?: { publication: Publication | "Demo"; headline: string; url: string | null };
}

export interface Trend {
  id: string;
  name: string;
  color: string;
  status: "draft" | "active" | "retired";
  /** the one named cause, in a sentence */
  cause: string;
  /** big-picture briefing, a few short paragraphs */
  summary: string[];
  timeline: TimelineEntry[];
  links: TrendLink[];
  createdAt: string;
  approvedAt?: string;
  retiredAt?: string;
  /** when a story was last added */
  lastStoryAt: string;
  isDemo?: boolean;
  predictions?: TrendPrediction[];
}

/** What players receive: an active (or retired) trend, with which linked stories are on the map now. */
export interface PublicTrend extends Omit<Trend, "links"> {
  links: (TrendLink & { live: boolean })[];
}

/** Problems that stop a trend from being shown to players. Empty means it passes the rules. */
export function trendProblems(t: Trend, all: Trend[]): string[] {
  const out: string[] = [];
  const stories = new Set(t.links.map((l) => l.eventId));
  const countries = new Set(t.links.map((l) => l.country));
  if (stories.size < TREND_RULES.minStories) out.push(`needs at least ${TREND_RULES.minStories} stories (has ${stories.size})`);
  if (countries.size < TREND_RULES.minCountries) out.push(`needs stories in at least ${TREND_RULES.minCountries} countries (has ${countries.size})`);
  if (!t.cause.trim()) out.push("needs a named cause");
  if (!t.summary.length) out.push("needs a big-picture summary");
  for (const l of t.links) {
    if (!l.note.trim()) out.push(`link to ${l.eventId} has no explanation`);
    if (l.source.publication !== "Demo" && !l.source.url) out.push(`link to ${l.eventId} has no source`);
  }
  for (const id of stories) {
    const n = all.filter((o) => o.id !== t.id && o.status === "active" && o.links.some((l) => l.eventId === id)).length;
    if (n + 1 > TREND_RULES.maxTrendsPerStory) out.push(`story ${id} is already in ${n} other trends`);
  }
  return out;
}

/** Retires active trends that have gone quiet. Returns true when something changed. */
export function retireQuietTrends(trends: Trend[], now: Date): boolean {
  let changed = false;
  for (const t of trends) {
    if (t.status !== "active") continue;
    if (now.getTime() - Date.parse(t.lastStoryAt) > TREND_RULES.retireAfterDays * 86400_000) {
      t.status = "retired";
      t.retiredAt = now.toISOString();
      changed = true;
    }
  }
  return changed;
}

/** Active and retired trends for players, each link marked with whether its story is on the map. */
export function toPublicTrends(trends: Trend[], events: NewsEvent[]): PublicTrend[] {
  const live = new Set(events.map((e) => e.id));
  return trends
    .filter((t) => t.status === "active" || t.status === "retired")
    .map((t) => ({ ...t, links: t.links.map((l) => ({ ...l, live: live.has(l.eventId) })) }))
    .sort((a, b) => (a.status === b.status ? Date.parse(b.lastStoryAt) - Date.parse(a.lastStoryAt) : a.status === "active" ? -1 : 1));
}

/** Trends a story belongs to (active ones only). */
export function trendsForEvent(trends: PublicTrend[], eventId: string): PublicTrend[] {
  return trends.filter((t) => t.status === "active" && t.links.some((l) => l.eventId === eventId && l.live));
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

// ---------------------------------------------------------------- connect-the-dots quiz

export interface ConnectQuestion {
  id: string;
  prompt: string;
  choices: string[];
  /** the correct choice's text (graded by text, so a reshuffle never marks a right answer wrong) */
  answer: string;
  explanation: string;
}

function seeded(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * "Connect the dots": questions built only from trend data (the trend itself and the others), so
 * the server can rebuild exactly the same quiz to grade it. Up to 6 questions.
 */
export function connectQuiz(t: Pick<Trend, "id" | "name" | "cause" | "links">, all: Pick<Trend, "id" | "cause" | "links">[]): ConnectQuestion[] {
  const rnd = seeded(`${t.id}|${t.links.map((l) => l.eventId).join(",")}`);
  const others = all.filter((o) => o.id !== t.id);
  const otherNotes = others.flatMap((o) => o.links.filter((l) => !t.links.some((x) => x.eventId === l.eventId)).map((l) => l.note));
  const outsideStories = [...new Set(others.flatMap((o) => o.links.filter((l) => !t.links.some((x) => x.eventId === l.eventId)).map((l) => l.eventTitle)))];
  const qs: ConnectQuestion[] = [];
  const links = shuffle(t.links, rnd).slice(0, 4);

  for (const l of links.slice(0, 3)) {
    const wrong = shuffle([...t.links.filter((x) => x.eventId !== l.eventId).map((x) => x.note), ...otherNotes], rnd).filter((n) => n !== l.note);
    const distractors = [...new Set(wrong)].slice(0, 3);
    if (distractors.length < 2) continue;
    qs.push({
      id: `how-${l.eventId}`,
      prompt: `"${l.eventTitle}": how is this story connected to "${t.name}"?`,
      choices: shuffle([l.note, ...distractors], rnd),
      answer: l.note,
      explanation: l.note,
    });
  }
  for (const l of links.slice(0, 2)) {
    qs.push({
      id: `kind-${l.eventId}`,
      prompt: `Is "${l.eventTitle}" a direct result of the cause, or a ripple effect?`,
      choices: ["Direct: the cause acts on it itself", "Ripple: a knock-on effect"],
      answer: l.kind === "direct" ? "Direct: the cause acts on it itself" : "Ripple: a knock-on effect",
      explanation: `${l.kind === "direct" ? "Direct" : "Ripple"}. ${l.note}`,
    });
  }
  if (outsideStories.length >= 2) {
    const l = links[0];
    if (l) {
      const choices = shuffle([l.eventTitle, ...shuffle(outsideStories, rnd).slice(0, 3)], rnd);
      qs.push({ id: `which-${l.eventId}`, prompt: `Which of these stories is part of "${t.name}"?`, choices, answer: l.eventTitle, explanation: l.note });
    }
  }
  const causes = [...new Set(others.map((o) => o.cause))].filter((c) => c !== t.cause);
  if (causes.length >= 2) {
    qs.push({ id: "cause", prompt: `What is the one cause that links the stories in "${t.name}"?`, choices: shuffle([t.cause, ...shuffle(causes, rnd).slice(0, 3)], rnd), answer: t.cause, explanation: t.cause });
  }
  return qs.slice(0, 6);
}
