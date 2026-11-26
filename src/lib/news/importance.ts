/**
 * Transparent importance model. See docs/IMPORTANCE.md for the rationale.
 *
 *   score = 100 × (0.35·coverage + 0.20·prominence + 0.20·consequences + 0.15·recency + 0.10·significance)
 *
 * - coverage:     distinct approved outlets reporting the event independently (0–6 → 0–1).
 *                 Syndicated copies (e.g. a wire story republished elsewhere) are collapsed upstream
 *                 and never counted twice.
 * - prominence:   how often the event appears across feeds, including top-story placement; saturating.
 * - consequences: estimated international consequences (0–1), from the classifier.
 * - recency:      exponential decay with a 36-hour half-life.
 * - significance: economic / humanitarian / diplomatic / political significance (0–1).
 *
 * Coverage is an imperfect proxy for importance, so humanitarian events get a score floor and
 * consequences/significance are judged independently of how much coverage an event received.
 */
import { HUMANITARIAN_FLOOR, IMPORTANCE_WEIGHTS, TIER_THRESHOLDS } from "../config";
import type { Category, Importance, ImportanceBreakdown, Tier } from "../types";

export interface ImportanceSignals {
  outlets: number;
  articles: number;
  topStories?: number;
  ageHours: number;
  consequences: number;
  significance: number;
  category: Category;
}

const clamp = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
export const HALF_LIFE_HOURS = 36;

export function breakdownFor(s: ImportanceSignals): ImportanceBreakdown {
  return {
    coverage: clamp(s.outlets / 6),
    prominence: clamp(1 - Math.exp(-(s.articles + 2 * (s.topStories ?? 0)) / 6)),
    consequences: clamp(s.consequences),
    recency: clamp(Math.pow(0.5, Math.max(0, s.ageHours) / HALF_LIFE_HOURS)),
    significance: clamp(s.significance),
  };
}

export function tierFor(score: number): Tier {
  if (score >= TIER_THRESHOLDS.global) return "global";
  if (score >= TIER_THRESHOLDS.major) return "major";
  if (score >= TIER_THRESHOLDS.significant) return "significant";
  if (score >= TIER_THRESHOLDS.notable) return "notable";
  return "minor";
}

export function scoreImportance(s: ImportanceSignals, weights = IMPORTANCE_WEIGHTS): Importance {
  const b = breakdownFor(s);
  const total = weights.coverage + weights.prominence + weights.consequences + weights.recency + weights.significance;
  let score =
    (100 *
      (weights.coverage * b.coverage +
        weights.prominence * b.prominence +
        weights.consequences * b.consequences +
        weights.recency * b.recency +
        weights.significance * b.significance)) /
    (total || 1);
  if (s.category === "humanitarian" && s.significance >= 0.7) score = Math.max(score, HUMANITARIAN_FLOOR);
  score = Math.round(Math.max(0, Math.min(100, score)));
  return { score, tier: tierFor(score), breakdown: b };
}
