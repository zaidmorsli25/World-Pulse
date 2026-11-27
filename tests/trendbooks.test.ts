import { describe, expect, it } from "vitest";
import { buildDemoContent } from "@/data/demo/events";
import { buildDemoTrends } from "@/data/demo/trends";
import { answerPrediction, claimPrediction, connectQuizOpen, followBonus, followTrend, GameError, newPlayer, submitConnectQuiz, TREND_REWARDS, trendPages } from "@/lib/game/engine";
import { connectQuiz, toPublicTrends } from "@/lib/trends";
import type { PlayerState } from "@/lib/types";

const T0 = new Date("2026-11-27T12:00:00Z");
const demo = buildDemoContent(T0);
const trends = toPublicTrends(buildDemoTrends(demo.events, T0), demo.events);
const chokepoints = trends.find((t) => t.id === "demo-chokepoints")!;
const climate = trends.find((t) => t.id === "demo-climate-security")!;
const fresh = () => newPlayer("u1", "tester", T0).state;
const readAll = (p: PlayerState): PlayerState => ({ ...p, briefingsRead: demo.events.map((e) => e.id) });

describe("trend books", () => {
  it("pays follow XP once, even after unfollowing and following again", () => {
    let p = followTrend(fresh(), chokepoints, true, T0).state;
    expect(p.xp).toBe(TREND_REWARDS.followXp);
    p = followTrend(p, chokepoints, false, T0).state;
    expect(p.trendBooks!["demo-chokepoints"].following).toBe(false);
    p = followTrend(p, chokepoints, true, T0).state;
    expect(p.xp).toBe(TREND_REWARDS.followXp);
  });

  it("adds a page for each linked story read, and opens the quiz when all are read", () => {
    let p = followTrend(fresh(), chokepoints, true, T0).state;
    expect(trendPages(p, chokepoints)).toEqual([]);
    expect(connectQuizOpen(p, chokepoints)).toBe(false);
    expect(() => submitConnectQuiz(p, chokepoints, trends, {}, T0)).toThrow(GameError);
    p = readAll(p);
    expect(trendPages(p, chokepoints)).toHaveLength(chokepoints.links.length);
    expect(connectQuizOpen(p, chokepoints)).toBe(true);
  });

  it("builds the same quiz every time and grades by answer text", () => {
    const a = connectQuiz(chokepoints, trends);
    const b = connectQuiz(chokepoints, trends);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThanOrEqual(3);
    for (const q of a) expect(q.choices).toContain(q.answer);
    let p = readAll(followTrend(fresh(), chokepoints, true, T0).state);
    const answers = Object.fromEntries(a.map((q) => [q.id, q.answer]));
    const r = submitConnectQuiz(p, chokepoints, trends, answers, T0);
    expect(r.correct).toBe(a.length);
    expect(r.coins).toBe(a.length * TREND_REWARDS.quizCoinsPerCorrect + TREND_REWARDS.quizPerfectCoins);
    p = r.state;
    // paid once
    const again = submitConnectQuiz(p, chokepoints, trends, answers, T0);
    expect(again.coins).toBe(0);
    expect(again.state.coins).toBe(p.coins);
  });

  it("pays more when following more trends", () => {
    let p = followTrend(fresh(), chokepoints, true, T0).state;
    expect(followBonus(p)).toBe(1);
    p = followTrend(p, climate, true, T0).state;
    expect(followBonus(p)).toBeCloseTo(1.1);
  });

  it("takes predictions only while open, and pays once when resolved", () => {
    let p = followTrend(fresh(), chokepoints, true, T0).state;
    expect(() => answerPrediction(p, chokepoints, "demo-p1", 0, T0)).toThrow(GameError); // already resolved
    p = answerPrediction(p, chokepoints, "demo-p2", 1, T0).state;
    expect(() => answerPrediction(p, chokepoints, "demo-p2", 0, T0)).toThrow(GameError); // one answer only
    expect(() => claimPrediction(p, chokepoints, "demo-p2", T0)).toThrow(GameError); // not resolved yet
    // resolve it as the hourly task would
    const resolved = { ...chokepoints, predictions: chokepoints.predictions!.map((x) => (x.id === "demo-p2" ? { ...x, answer: 1 } : x)) };
    const coins = p.coins;
    p = claimPrediction(p, resolved, "demo-p2", T0).state;
    expect(p.coins).toBe(coins + TREND_REWARDS.predictionCoins);
    expect(() => claimPrediction(p, resolved, "demo-p2", T0)).toThrow(GameError);
  });
});
