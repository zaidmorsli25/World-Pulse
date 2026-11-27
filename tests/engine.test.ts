import { describe, expect, it } from "vitest";
import { buildDemoContent } from "@/data/demo/events";
import { REWARDS } from "@/lib/config";
import { CATALOG, MAX_DISPLAY } from "@/lib/game/catalog";
import { answerQuestion, completeQuiz, equip, exploreCountry, GameError, newPlayer, purchase, startQuiz, touchDaily, updateAvatar } from "@/lib/game/engine";
import { levelFromXp, rankIndexForLevel } from "@/lib/game/progression";
import type { PlayerState, Quiz } from "@/lib/types";

const T0 = new Date("2026-06-10T09:00:00Z");
const quiz: Quiz = buildDemoContent(T0).quizzes[0];
const fresh = () => newPlayer("u1", "tester", T0).state;

function answerAll(p: PlayerState, q: Quiz, pick: (i: number) => number): PlayerState {
  let s = startQuiz(p, q, T0).state;
  q.questions.forEach((_, i) => (s = answerQuestion(s, q, i, pick(i), T0).state));
  return s;
}

describe("quiz rewards", () => {
  it("pays per correct answer plus the perfect bonus on the first completion", () => {
    const p = fresh();
    const s = answerAll(p, quiz, (i) => quiz.questions[i].answerIndex);
    const r = completeQuiz(s, quiz, quiz.category, T0);
    const n = quiz.questions.length;
    expect(r.correct).toBe(n);
    expect(r.perfect).toBe(true);
    const base = n * REWARDS.coinsPerCorrect + REWARDS.perfectBonusCoins;
    // Achievements (e.g. First Briefing) may add more on top; the quiz ledger entry is exact.
    const quizEntry = r.ledger.find((l) => l.kind === "quiz")!;
    expect(quizEntry.coins).toBe(base);
    expect(quizEntry.xp).toBe(n * REWARDS.xpPerCorrect + REWARDS.perfectBonusXp);
    expect(r.state.coins).toBeGreaterThanOrEqual(p.coins + base);
  });

  it("pays nothing for replays, so quizzes cannot be farmed", () => {
    const s1 = answerAll(fresh(), quiz, () => 0);
    const first = completeQuiz(s1, quiz, quiz.category, T0).state;
    const s2 = answerAll(first, quiz, (i) => quiz.questions[i].answerIndex);
    const replay = completeQuiz(s2, quiz, quiz.category, T0);
    expect(replay.firstCompletion).toBe(false);
    expect(replay.ledger.find((l) => l.kind === "quiz")).toBeUndefined();
    expect(replay.state.quizRecords[quiz.id].attempts).toBe(2);
    expect(replay.state.stats.quizzesCompleted).toBe(1);
  });

  it("locks the first answer so the revealed explanation cannot be used to change it", () => {
    let s = startQuiz(fresh(), quiz, T0).state;
    const right = quiz.questions[0].answerIndex;
    const wrong = (right + 1) % quiz.questions[0].choices.length;
    s = answerQuestion(s, quiz, 0, wrong, T0).state;
    const again = answerQuestion(s, quiz, 0, right, T0);
    expect(again.locked).toBe(true);
    expect(again.correct).toBe(false);
    expect(again.state.pendingQuiz!.answers[0]).toBe(wrong);
  });

  it("resumes an unfinished first attempt instead of resetting it", () => {
    let s = startQuiz(fresh(), quiz, T0).state;
    s = answerQuestion(s, quiz, 0, 0, T0).state;
    const restarted = startQuiz(s, quiz, T0);
    expect(restarted.resumed).not.toBeNull();
    expect(restarted.state.pendingQuiz!.answers[0]).toBe(0);
  });

  it("refuses to complete a quiz with unanswered questions", () => {
    const s = startQuiz(fresh(), quiz, T0).state;
    expect(() => completeQuiz(s, quiz, quiz.category, T0)).toThrow(GameError);
  });
});

describe("shop", () => {
  const cheap = CATALOG.find((i) => !i.starter && !i.rankReward && i.minRank === 0 && i.price > 0 && i.price <= REWARDS.signupCoins)!;
  const locked = CATALOG.find((i) => !i.rankReward && i.minRank > 0)!;

  it("deducts coins and adds the item", () => {
    const p = fresh();
    const r = purchase(p, cheap.id, T0);
    expect(r.state.inventory).toContain(cheap.id);
    expect(r.state.coins).toBeGreaterThanOrEqual(p.coins - cheap.price);
  });
  it("rejects duplicates, rank-locked items, rank rewards and unaffordable items", () => {
    const p = purchase(fresh(), cheap.id, T0).state;
    expect(() => purchase(p, cheap.id, T0)).toThrow(/already own/);
    expect(() => purchase(fresh(), locked.id, T0)).toThrow(/Reach the rank/);
    const reward = CATALOG.find((i) => i.rankReward)!;
    expect(() => purchase(fresh(), reward.id, T0)).toThrow(/awarded automatically/);
    const pricey = CATALOG.find((i) => i.minRank === 0 && i.price > REWARDS.signupCoins + 500)!;
    if (pricey) expect(() => purchase(fresh(), pricey.id, T0)).toThrow(/Not enough coins/);
  });
  it("only equips owned items into matching slots, and caps the display shelf", () => {
    expect(() => equip(fresh(), "outfit-blazer", "outfit", T0)).toThrow(/do not own/);
    expect(() => equip(fresh(), "desk-folding", "outfit", T0)).toThrow(/does not fit/);
    let p = fresh();
    const models = CATALOG.filter((i) => i.slot === "display" && !i.rankReward).slice(0, MAX_DISPLAY + 1);
    p = { ...p, inventory: [...p.inventory, ...models.map((m) => m.id)] };
    for (const m of models.slice(0, MAX_DISPLAY)) p = equip(p, m.id, "display", T0).state;
    expect(p.equipped.display).toHaveLength(MAX_DISPLAY);
    expect(() => equip(p, models[MAX_DISPLAY].id, "display", T0)).toThrow(/holds/);
    p = equip(p, models[0].id, "display", T0).state; // toggle off
    expect(p.equipped.display).toHaveLength(MAX_DISPLAY - 1);
  });
});

describe("progression", () => {
  it("starts at level 1 Recruit and grows xp per level", () => {
    const a = levelFromXp(0);
    expect(a.level).toBe(1);
    expect(a.rank.name).toBe("Recruit");
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(99).level).toBe(1);
    expect(rankIndexForLevel(37)).toBe(9);
  });
  it("grants rank rewards automatically on promotion", () => {
    let p = fresh();
    p = { ...p, xp: 2000 };
    const r = exploreCountry(p, "FRA", T0).state;
    const rank = levelFromXp(r.xp).rankIndex;
    for (const item of CATALOG.filter((i) => i.rankReward && i.minRank <= rank)) expect(r.inventory).toContain(item.id);
  });
});

describe("streaks", () => {
  const day = (d: number) => new Date(T0.getTime() + d * 86400000);
  it("increments on consecutive days and pays the daily bonus", () => {
    const r = touchDaily(fresh(), day(1));
    expect(r.state.streak.count).toBe(2);
    expect(r.ledger.some((l) => l.kind === "streak")).toBe(true);
  });
  it("uses a shield for a single missed day, then resets on a longer break without taking coins", () => {
    const p = fresh();
    const shielded = touchDaily(p, day(2)).state;
    expect(shielded.streak.count).toBe(2);
    expect(shielded.streak.shields).toBe(0);
    const broken = touchDaily(shielded, day(6)).state;
    expect(broken.streak.count).toBe(1);
    expect(broken.coins).toBeGreaterThanOrEqual(shielded.coins);
  });
  it("is idempotent within a day", () => {
    const p = fresh();
    expect(touchDaily(p, T0).state).toBe(p);
  });
});

describe("profile", () => {
  it("validates avatar options and exploration ids", () => {
    expect(() => updateAvatar(fresh(), { skin: 99, hair: 0, hairColor: 0, backdrop: 0 }, T0)).toThrow(GameError);
    expect(() => updateAvatar(fresh(), { skin: 0, hair: 0, hairColor: 0, backdrop: 0, eyes: 9 }, T0)).toThrow(GameError);
    expect(() => updateAvatar(fresh(), { skin: 0, hair: 0, hairColor: 0, backdrop: 0, mouth: 1.5 }, T0)).toThrow(GameError);
    // old avatars (4 fields) still save; new optional parts are kept, unknown keys dropped
    expect(updateAvatar(fresh(), { skin: 1, hair: 2, hairColor: 3, backdrop: 4 }, T0).state.avatar).toEqual({ skin: 1, hair: 2, hairColor: 3, backdrop: 4 });
    const full = { skin: 7, hair: 13, hairColor: 11, backdrop: 9, face: 3, eyes: 4, eyeColor: 4, brows: 4, mouth: 4, facialHair: 4, glasses: 3, details: 3 };
    expect(updateAvatar(fresh(), { ...full, extra: 1 } as never, T0).state.avatar).toEqual(full);
    expect(() => exploreCountry(fresh(), "NOPE", T0)).toThrow(GameError);
    const once = exploreCountry(fresh(), "KEN", T0).state;
    const twice = exploreCountry(once, "KEN", T0);
    expect(twice.events.xp).toBe(0);
  });
});
