import { MAX_LEVEL, RANKS, xpToNext } from "../config";

export interface LevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForLevel: number;
  progress: number; // 0..1
  rankIndex: number;
  rank: (typeof RANKS)[number];
  nextRank: (typeof RANKS)[number] | null;
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(xp));
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  const xpForLevel = xpToNext(level);
  const rankIndex = rankIndexForLevel(level);
  return {
    level,
    xpIntoLevel: remaining,
    xpForLevel,
    progress: level >= MAX_LEVEL ? 1 : remaining / xpForLevel,
    rankIndex,
    rank: RANKS[rankIndex],
    nextRank: RANKS[rankIndex + 1] ?? null,
  };
}

export function rankIndexForLevel(level: number): number {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (level >= r.level) idx = i;
  });
  return idx;
}

export function totalXpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < level; l++) total += xpToNext(l);
  return total;
}
