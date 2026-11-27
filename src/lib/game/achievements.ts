import type { PlayerState } from "../types";
import countries from "@/data/generated/countries.json";

const REGION_BY_ID = new Map((countries as { id: string; region: string | null }[]).map((c) => [c.id, c.region]));
export const INHABITED_CONTINENTS = ["Africa", "Americas", "Asia", "Europe", "Oceania"];

export function continentsExplored(p: PlayerState): string[] {
  const set = new Set<string>();
  for (const id of p.countriesExplored) {
    const r = REGION_BY_ID.get(id);
    if (r && INHABITED_CONTINENTS.includes(r)) set.add(r);
  }
  return [...set];
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  coins: number;
  xp: number;
  target: number;
  progress: (p: PlayerState) => number;
}

const cat = (p: PlayerState, ...c: (keyof PlayerState["categoryQuizzes"])[]) => c.reduce((s, k) => s + (p.categoryQuizzes[k] ?? 0), 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-briefing", name: "First Briefing", description: "Complete your first quiz.", icon: "📰", coins: 25, xp: 15, target: 1, progress: (p) => p.stats.quizzesCompleted },
  { id: "perfect-briefing", name: "Perfect Briefing", description: "Score 100% on a quiz.", icon: "💯", coins: 40, xp: 25, target: 1, progress: (p) => p.stats.perfectQuizzes },
  { id: "global-explorer", name: "Global Explorer", description: "Explore 25 different countries on the map.", icon: "🧭", coins: 80, xp: 50, target: 25, progress: (p) => p.countriesExplored.length },
  { id: "continental-explorer", name: "Continental Explorer", description: "Explore a country on all 5 inhabited continents.", icon: "🗺️", coins: 60, xp: 40, target: 5, progress: (p) => continentsExplored(p).length },
  { id: "election-expert", name: "Election Expert", description: "Complete 3 election briefings.", icon: "🗳️", coins: 60, xp: 40, target: 3, progress: (p) => cat(p, "election", "leadership") },
  { id: "economic-analyst", name: "Economic Analyst", description: "Complete 3 economy, trade or energy briefings.", icon: "📈", coins: 60, xp: 40, target: 3, progress: (p) => cat(p, "economy", "trade", "energy", "sanctions") },
  { id: "diplomatic-master", name: "Diplomatic Master", description: "Complete 3 diplomacy briefings.", icon: "🤝", coins: 60, xp: 40, target: 3, progress: (p) => cat(p, "diplomacy") },
  { id: "un-expert", name: "United Nations Expert", description: "Complete 2 briefings about international organizations.", icon: "🇺🇳", coins: 60, xp: 40, target: 2, progress: (p) => cat(p, "organizations") },
  { id: "peacekeeper", name: "Conflict Analyst", description: "Complete 3 conflict or security briefings.", icon: "🕊️", coins: 60, xp: 40, target: 3, progress: (p) => cat(p, "conflict", "security") },
  { id: "humanitarian", name: "Humanitarian Watch", description: "Complete 2 humanitarian briefings.", icon: "❤️‍🩹", coins: 60, xp: 40, target: 2, progress: (p) => cat(p, "humanitarian") },
  { id: "leader-spotter", name: "Leader Spotter", description: "Open 10 political figure profiles.", icon: "🧑‍💼", coins: 50, xp: 30, target: 10, progress: (p) => p.figuresViewed.length },
  { id: "streak-3", name: "Morning Habit", description: "Reach a 3-day streak.", icon: "🔥", coins: 40, xp: 25, target: 3, progress: (p) => p.streak.best },
  { id: "streak-7", name: "Week of Insight", description: "Reach a 7-day streak.", icon: "📅", coins: 100, xp: 60, target: 7, progress: (p) => p.streak.best },
  { id: "collector", name: "Collector", description: "Own 10 shop items.", icon: "🏆", coins: 80, xp: 40, target: 10, progress: (p) => p.inventory.length },
  { id: "world-affairs-scholar", name: "World Affairs Scholar", description: "Complete 10 different quizzes.", icon: "🎓", coins: 150, xp: 100, target: 10, progress: (p) => Object.keys(p.quizRecords).length },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
