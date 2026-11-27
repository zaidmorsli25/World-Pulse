import "server-only";
import { buildDemoTrends } from "@/data/demo/trends";
import { retireQuietTrends, toPublicTrends, type PublicTrend, type Trend } from "@/lib/trends";
import { getContent } from "./content";
import { getStore } from "./store";

export const TRENDS_KEY = "trends-v1";

/** Every stored trend (drafts included), with quiet ones retired. Live mode only. */
export async function loadTrends(now = new Date()): Promise<Trend[]> {
  const store = getStore();
  const saved = (await store.getMeta<Trend[]>(TRENDS_KEY).catch(() => null)) ?? [];
  if (retireQuietTrends(saved, now)) await saveTrends(saved);
  return saved;
}

export async function saveTrends(trends: Trend[]) {
  await getStore().setMeta(TRENDS_KEY, trends);
  memo = null;
}

let memo: { at: number; trends: PublicTrend[] } | null = null;

/** Trends for players: approved (active or retired) only. Demo mode gets the demo trends. */
export async function getPublicTrends(): Promise<PublicTrend[]> {
  const c = await getContent();
  if (c.mode === "demo") return toPublicTrends(buildDemoTrends(c.events, new Date(c.updatedAt ?? Date.now())), c.events);
  if (memo && Date.now() - memo.at < 60_000) return memo.trends;
  try {
    const trends = toPublicTrends(await loadTrends(), c.events);
    memo = { at: Date.now(), trends };
    return trends;
  } catch (e) {
    console.error("[trends] could not load", e);
    return [];
  }
}
