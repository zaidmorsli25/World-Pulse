/**
 * Pure game engine. Every function takes the current player state and returns a new state
 * plus ledger entries. The server is the only place these run for real accounts, so coin and
 * XP maths can never be manipulated from the browser.
 */
import { AVATAR_LIMITS, REQUIRED_AVATAR_KEYS } from "./avatarOptions";
import { REWARDS, RANKS } from "../config";
import type {
  AvatarConfig,
  Category,
  DailyCounters,
  GameEvents,
  LedgerEntry,
  LedgerKind,
  PlayerState,
  Quiz,
  QuizAttempt,
} from "../types";
import { ACHIEVEMENTS } from "./achievements";
import { CATALOG, CATALOG_BY_ID, MAX_DISPLAY, STARTER_ITEMS } from "./catalog";
import { MISSIONS_BY_ID, pickMissions } from "./missions";
import { levelFromXp } from "./progression";
import countries from "@/data/generated/countries.json";

const REGION_BY_ID = new Map((countries as { id: string; region: string | null }[]).map((c) => [c.id, c.region]));
const COUNTRY_IDS = new Set(REGION_BY_ID.keys());

export class GameError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export function emptyDaily(day: string): DailyCounters {
  return { day, briefingsCompleted: 0, newCountries: 0, diplomacyQuizzes: 0, perfectQuizzes: 0, continents: [], figuresViewed: 0, economyBriefings: 0, correctAnswers: 0 };
}

export function newPlayer(userId: string, username: string, now: Date): { state: PlayerState; ledger: LedgerEntry[] } {
  const day = dayKey(now);
  const state: PlayerState = {
    userId,
    username,
    avatar: { skin: 2, hair: 0, hairColor: 1, backdrop: 0 },
    coins: REWARDS.signupCoins,
    xp: 0,
    streak: { count: 1, best: 1, lastActiveDay: day, shields: 1 },
    quizRecords: {},
    inventory: [...STARTER_ITEMS],
    equipped: { outfit: "outfit-casual", background: "bg-basement", desk: "desk-folding", wallmap: "map-poster", monitor: "mon-laptop", bookshelf: "shelf-crate", display: [] },
    achievements: {},
    countriesExplored: [],
    figuresViewed: [],
    briefingsRead: [],
    categoryQuizzes: {},
    daily: emptyDaily(day),
    missions: { day, ids: pickMissions(userId, day), claimed: [] },
    stats: { quizzesCompleted: 0, perfectQuizzes: 0, correctAnswers: 0, questionsAnswered: 0 },
    createdAt: now.toISOString(),
    version: 0,
  };
  return { state, ledger: [entry(userId, "signup", REWARDS.signupCoins, 0, null, "Welcome bonus", now)] };
}

function entry(userId: string, kind: LedgerKind, coins: number, xp: number, ref: string | null, note: string, now: Date): LedgerEntry {
  return { id: uid(), userId, kind, coins, xp, ref, note, at: now.toISOString() };
}

const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export interface EngineResult {
  state: PlayerState;
  ledger: LedgerEntry[];
  events: GameEvents;
}

/** Applies XP/coins, then rank rewards and achievements, collecting celebration events. */
function settle(before: PlayerState, s: PlayerState, ledger: LedgerEntry[], now: Date): EngineResult {
  const events: GameEvents = { achievements: [], coins: 0, xp: 0 };
  // Achievements can cascade (e.g. "Collector" after a rank reward), so loop until stable.
  for (let guard = 0; guard < 5; guard++) {
    let changed = false;
    // Rank rewards
    const lvl = levelFromXp(s.xp);
    for (const item of CATALOG) {
      if (item.rankReward && lvl.rankIndex >= item.minRank && !s.inventory.includes(item.id)) {
        s.inventory.push(item.id);
        changed = true;
      }
    }
    for (const a of ACHIEVEMENTS) {
      if (!s.achievements[a.id] && a.progress(s) >= a.target) {
        s.achievements[a.id] = now.toISOString();
        s.coins += a.coins;
        s.xp += a.xp;
        ledger.push(entry(s.userId, "achievement", a.coins, a.xp, a.id, `Achievement: ${a.name}`, now));
        events.achievements.push(a.id);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const a = levelFromXp(before.xp);
  const b = levelFromXp(s.xp);
  if (b.level > a.level) events.levelUp = { from: a.level, to: b.level };
  if (b.rankIndex > a.rankIndex) events.rankUp = { from: RANKS[a.rankIndex].name, to: RANKS[b.rankIndex].name };
  events.coins = s.coins - before.coins;
  events.xp = s.xp - before.xp;
  s.version = before.version + 1;
  return { state: s, ledger, events };
}

/**
 * Called on every authenticated load. Rolls daily counters and missions, and updates the streak.
 * The streak is forgiving: a missed day is covered by a "streak shield" (one regenerates each
 * week) and a longer break only resets the count, never removes coins or progress.
 */
export function touchDaily(p: PlayerState, now: Date): EngineResult {
  const s = clone(p);
  const ledger: LedgerEntry[] = [];
  const today = dayKey(now);
  if (s.daily.day !== today) s.daily = emptyDaily(today);
  if (s.missions.day !== today) s.missions = { day: today, ids: pickMissions(s.userId, today), claimed: [] };
  const last = s.streak.lastActiveDay;
  if (last !== today) {
    const gap = last ? Math.round((Date.parse(today) - Date.parse(last)) / 86400000) : 1;
    if (gap === 1) s.streak.count += 1;
    else if (gap === 2 && s.streak.shields > 0) {
      s.streak.shields -= 1;
      s.streak.count += 1;
    } else s.streak.count = 1;
    if (s.streak.count % 7 === 0) s.streak.shields = Math.min(2, s.streak.shields + 1);
    s.streak.best = Math.max(s.streak.best, s.streak.count);
    s.streak.lastActiveDay = today;
    if (s.streak.count > 1) {
      const bonus = REWARDS.streakDailyCoins;
      s.coins += bonus;
      ledger.push(entry(s.userId, "streak", bonus, 0, today, `Daily streak day ${s.streak.count}`, now));
    }
  }
  if (JSON.stringify(s) === JSON.stringify(p)) return { state: p, ledger: [], events: { achievements: [], coins: 0, xp: 0 } };
  return settle(p, s, ledger, now);
}

export interface QuizOutcome extends EngineResult {
  correct: number;
  total: number;
  perfect: boolean;
  firstCompletion: boolean;
  improved: boolean;
  results: { correct: boolean; answerIndex: number }[];
  attempt: QuizAttempt;
}

export function gradeQuiz(quiz: Quiz, answers: number[]) {
  if (!Array.isArray(answers) || answers.length !== quiz.questions.length) throw new GameError("bad_answers", "Answer every question before submitting.");
  return quiz.questions.map((q, i) => ({ correct: answers[i] === q.answerIndex, answerIndex: q.answerIndex }));
}

export interface AnswerResult extends EngineResult {
  correct: boolean;
  answerIndex: number;
  explanation: string;
  context?: string;
  locked: boolean;
}

/**
 * Records the player's answer to one question and reveals the explanation. The first answer to
 * each question is locked in, so revealing the explanation cannot be used to change answers.
 */
export function answerQuestion(p: PlayerState, quiz: Quiz, index: number, choice: number, now: Date): AnswerResult {
  const q = quiz.questions[index];
  if (!q) throw new GameError("bad_question", "Unknown question.");
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.choices.length) throw new GameError("bad_choice", "Invalid choice.");
  const s = clone(p);
  if (!s.pendingQuiz || s.pendingQuiz.quizId !== quiz.id || s.pendingQuiz.answers.length !== quiz.questions.length) {
    s.pendingQuiz = { quizId: quiz.id, answers: quiz.questions.map(() => null) };
  }
  const existing = s.pendingQuiz.answers[index];
  const locked = existing !== null && existing !== undefined;
  const final = locked ? (existing as number) : choice;
  s.pendingQuiz.answers[index] = final;
  const res = locked ? { state: p, ledger: [], events: { achievements: [], coins: 0, xp: 0 } } : settle(p, s, [], now);
  return { ...res, correct: final === q.answerIndex, answerIndex: q.answerIndex, explanation: q.explanation, context: q.context, locked };
}

/**
 * Starts (or resumes) a quiz. A first attempt that is already in progress is resumed rather than
 * reset, so a player cannot peek at explanations, restart and then answer perfectly for rewards.
 * Completed quizzes can be replayed freely as practice.
 */
export function startQuiz(p: PlayerState, quiz: Quiz, now: Date): EngineResult & { resumed: (number | null)[] | null } {
  const pending = p.pendingQuiz;
  if (pending && pending.quizId === quiz.id && pending.answers.length === quiz.questions.length && !p.quizRecords[quiz.id]) {
    return { state: p, ledger: [], events: { achievements: [], coins: 0, xp: 0 }, resumed: pending.answers };
  }
  const s = clone(p);
  s.pendingQuiz = { quizId: quiz.id, answers: quiz.questions.map(() => null) };
  return { ...settle(p, s, [], now), resumed: null };
}

/**
 * Rewards: 20 coins + 10 XP per correct answer, +25/+25 for a perfect score (configurable).
 * Anti-farming: only the first completed attempt of a quiz pays rewards. Replays are free
 * practice (tracked for your best score) and can never be used to farm coins or XP.
 * Grading uses the answers locked in by answerQuestion(), never answers sent at submit time.
 */
export function completeQuiz(p: PlayerState, quiz: Quiz, category: Category, now: Date): QuizOutcome {
  const pending = p.pendingQuiz;
  if (!pending || pending.quizId !== quiz.id || pending.answers.some((a) => a === null || a === undefined)) {
    throw new GameError("incomplete_quiz", "Answer every question before finishing the quiz.");
  }
  const answers = pending.answers as number[];
  const results = gradeQuiz(quiz, answers);
  const correct = results.filter((r) => r.correct).length;
  const total = quiz.questions.length;
  const perfect = correct === total;
  const s = clone(p);
  s.pendingQuiz = null;
  const prev = s.quizRecords[quiz.id];
  const prevBest = prev?.bestCorrect ?? 0;
  const firstCompletion = !prev;
  let coins = firstCompletion ? correct * REWARDS.coinsPerCorrect : REWARDS.replayCoins;
  let xp = firstCompletion ? correct * REWARDS.xpPerCorrect : REWARDS.replayXp;
  if (firstCompletion && perfect) {
    coins += REWARDS.perfectBonusCoins;
    xp += REWARDS.perfectBonusXp;
  }
  s.coins += coins;
  s.xp += xp;
  s.quizRecords[quiz.id] = {
    bestCorrect: Math.max(prevBest, correct),
    total,
    attempts: (prev?.attempts ?? 0) + 1,
    perfect: !!prev?.perfect || perfect,
    coinsAwarded: (prev?.coinsAwarded ?? 0) + coins,
    xpAwarded: (prev?.xpAwarded ?? 0) + xp,
    firstCompletedAt: prev?.firstCompletedAt ?? now.toISOString(),
    lastAttemptAt: now.toISOString(),
  };
  s.stats.questionsAnswered += total;
  s.stats.correctAnswers += correct;
  if (firstCompletion) {
    s.stats.quizzesCompleted += 1;
    s.categoryQuizzes[category] = (s.categoryQuizzes[category] ?? 0) + 1;
    if (!s.briefingsRead.includes(quiz.eventId)) s.briefingsRead.push(quiz.eventId);
    s.daily.briefingsCompleted += 1;
    if (category === "diplomacy") s.daily.diplomacyQuizzes += 1;
    if (["economy", "trade", "energy", "sanctions"].includes(category)) s.daily.economyBriefings += 1;
  }
  if (perfect && !prev?.perfect) {
    s.stats.perfectQuizzes += 1;
    if (firstCompletion) s.daily.perfectQuizzes += 1;
  }
  if (firstCompletion) s.daily.correctAnswers += correct;
  const ledger: LedgerEntry[] = [];
  if (coins || xp) ledger.push(entry(s.userId, "quiz", coins, xp, quiz.id, `Quiz ${correct}/${total}${perfect ? " (perfect)" : ""}`, now));
  const settled = settle(p, s, ledger, now);
  const attempt: QuizAttempt = { id: uid(), userId: s.userId, quizId: quiz.id, eventId: quiz.eventId, answers, correct, total, coins, xp, at: now.toISOString() };
  return { ...settled, correct, total, perfect, firstCompletion, improved: correct > prevBest, results, attempt };
}

export function purchase(p: PlayerState, itemId: string, now: Date): EngineResult {
  const item = CATALOG_BY_ID.get(itemId);
  if (!item) throw new GameError("unknown_item", "That item does not exist.", 404);
  if (p.inventory.includes(itemId)) throw new GameError("owned", "You already own this item.");
  if (item.rankReward) throw new GameError("rank_reward", "This item is awarded automatically when you reach its rank.");
  const rank = levelFromXp(p.xp).rankIndex;
  if (rank < item.minRank) throw new GameError("rank_locked", `Reach the rank of ${RANKS[item.minRank].name} to unlock this item.`, 403);
  if (p.coins < item.price) throw new GameError("insufficient_funds", "Not enough coins yet. Complete more briefings to earn some!", 402);
  const s = clone(p);
  s.coins -= item.price;
  s.inventory.push(itemId);
  return settle(p, s, [entry(s.userId, "purchase", -item.price, 0, itemId, `Bought ${item.name}`, now)], now);
}

export function equip(p: PlayerState, itemId: string | null, slot: string, now: Date): EngineResult {
  const s = clone(p);
  if (slot === "display") {
    if (!itemId) throw new GameError("bad_item", "Choose a collectible.");
    const item = CATALOG_BY_ID.get(itemId);
    if (!item || item.slot !== "display") throw new GameError("bad_item", "That item is not a collectible.");
    if (!s.inventory.includes(itemId)) throw new GameError("not_owned", "You do not own this item.", 403);
    const shelf = s.equipped.display ?? [];
    if (shelf.includes(itemId)) s.equipped.display = shelf.filter((x) => x !== itemId);
    else {
      if (shelf.length >= MAX_DISPLAY) throw new GameError("shelf_full", `Your display shelf holds ${MAX_DISPLAY} models. Remove one first.`);
      s.equipped.display = [...shelf, itemId];
    }
    return settle(p, s, [], now);
  }
  const valid = ["outfit", "headwear", "accessory", "background", "desk", "wallmap", "monitor", "bookshelf", "flag", "globe"] as const;
  type V = (typeof valid)[number];
  if (!valid.includes(slot as V)) throw new GameError("bad_slot", "Unknown slot.");
  if (itemId === null) {
    if (["outfit", "background", "desk"].includes(slot)) throw new GameError("required_slot", "This slot always needs an item.");
    delete s.equipped[slot as V];
    return settle(p, s, [], now);
  }
  const item = CATALOG_BY_ID.get(itemId);
  if (!item || item.slot !== slot) throw new GameError("bad_item", "That item does not fit this slot.");
  if (!s.inventory.includes(itemId)) throw new GameError("not_owned", "You do not own this item.", 403);
  s.equipped[slot as V] = itemId;
  return settle(p, s, [], now);
}

export function exploreCountry(p: PlayerState, countryId: string, now: Date): EngineResult {
  if (!COUNTRY_IDS.has(countryId)) throw new GameError("unknown_country", "Unknown country.", 404);
  if (p.countriesExplored.includes(countryId)) return { state: p, ledger: [], events: { achievements: [], coins: 0, xp: 0 } };
  const s = clone(p);
  s.countriesExplored.push(countryId);
  s.daily.newCountries += 1;
  const region = REGION_BY_ID.get(countryId);
  if (region && !s.daily.continents.includes(region)) s.daily.continents.push(region);
  s.xp += REWARDS.exploreCountryXp;
  return settle(p, s, [entry(s.userId, "explore", 0, REWARDS.exploreCountryXp, countryId, "Explored a new country", now)], now);
}

export function viewFigure(p: PlayerState, figureId: string, validIds: Set<string>, now: Date): EngineResult {
  if (!validIds.has(figureId)) throw new GameError("unknown_figure", "Unknown political figure.", 404);
  if (p.figuresViewed.includes(figureId)) return { state: p, ledger: [], events: { achievements: [], coins: 0, xp: 0 } };
  const s = clone(p);
  s.figuresViewed.push(figureId);
  s.daily.figuresViewed += 1;
  return settle(p, s, [], now);
}

export function claimMission(p: PlayerState, missionId: string, now: Date): EngineResult {
  const def = MISSIONS_BY_ID.get(missionId);
  if (!def || !p.missions.ids.includes(missionId)) throw new GameError("unknown_mission", "That mission is not active today.", 404);
  if (p.missions.claimed.includes(missionId)) throw new GameError("claimed", "Reward already claimed.");
  if (def.progress(p.daily) < def.target) throw new GameError("incomplete", "Mission not complete yet.");
  const s = clone(p);
  s.missions.claimed.push(missionId);
  s.coins += def.coins;
  s.xp += def.xp;
  return settle(p, s, [entry(s.userId, "mission", def.coins, def.xp, missionId, `Mission: ${def.title}`, now)], now);
}

export { AVATAR_LIMITS };

export function updateAvatar(p: PlayerState, avatar: AvatarConfig, now: Date): EngineResult {
  const next: Record<string, number> = {};
  for (const k of Object.keys(AVATAR_LIMITS) as (keyof typeof AVATAR_LIMITS)[]) {
    const v = avatar[k];
    if (v === undefined && !(REQUIRED_AVATAR_KEYS as readonly string[]).includes(k)) continue;
    if (!Number.isInteger(v) || v! < 0 || v! >= AVATAR_LIMITS[k]) throw new GameError("bad_avatar", "Invalid avatar option.");
    next[k] = v!;
  }
  const s = clone(p);
  s.avatar = next as unknown as AvatarConfig;
  return settle(p, s, [], now);
}

export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;
