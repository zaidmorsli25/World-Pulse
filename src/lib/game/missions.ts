import type { DailyCounters } from "../types";

export interface MissionDef {
  id: string;
  title: string;
  icon: string;
  target: number;
  coins: number;
  xp: number;
  progress: (d: DailyCounters) => number;
}

export const MISSIONS: MissionDef[] = [
  { id: "m-three-briefings", title: "Complete three news briefings", icon: "📰", target: 3, coins: 60, xp: 40, progress: (d) => d.briefingsCompleted },
  { id: "m-one-briefing", title: "Complete a news briefing", icon: "🗞️", target: 1, coins: 25, xp: 15, progress: (d) => d.briefingsCompleted },
  { id: "m-new-country", title: "Learn about a new country", icon: "🧭", target: 1, coins: 20, xp: 15, progress: (d) => d.newCountries },
  { id: "m-diplomacy", title: "Complete a diplomacy-related quiz", icon: "🤝", target: 1, coins: 35, xp: 20, progress: (d) => d.diplomacyQuizzes },
  { id: "m-perfect", title: "Earn a perfect quiz score", icon: "💯", target: 1, coins: 40, xp: 25, progress: (d) => d.perfectQuizzes },
  { id: "m-continents", title: "Explore three continents", icon: "🌍", target: 3, coins: 35, xp: 25, progress: (d) => d.continents.length },
  { id: "m-leaders", title: "Identify five political leaders", icon: "🧑‍💼", target: 5, coins: 30, xp: 20, progress: (d) => d.figuresViewed },
  { id: "m-economy", title: "Complete a briefing about the global economy", icon: "📈", target: 1, coins: 35, xp: 20, progress: (d) => d.economyBriefings },
  { id: "m-correct", title: "Answer eight questions correctly", icon: "✅", target: 8, coins: 40, xp: 25, progress: (d) => d.correctAnswers },
];

export const MISSIONS_BY_ID = new Map(MISSIONS.map((m) => [m.id, m]));
export const MISSIONS_PER_DAY = 3;

/** Deterministic daily pick so every device shows the same missions for a player on a given day. */
export function pickMissions(userId: string, day: string): string[] {
  let h = 2166136261;
  for (const ch of `${userId}:${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const pool = [...MISSIONS];
  const out: string[] = [];
  while (out.length < MISSIONS_PER_DAY && pool.length) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0].id);
  }
  return out;
}
