/**
 * In-browser backend used ONLY by the standalone demo build (WORLDPULSE_STANDALONE=1).
 * It runs the same game engine as the server, with demo content, and keeps accounts and
 * progress in this browser's localStorage. Passwords are hashed with PBKDF2 (WebCrypto).
 * It exists so the game can be tried without a server; real deployments use the server API.
 */
import { buildDemoTrends } from "@/data/demo/trends";
import { toPublicTrends } from "@/lib/trends";
import { REWARDS } from "@/lib/config";
import { buildDemoContent } from "@/data/demo/events";
import { FIGURE_IDS } from "@/data/figures";
import {
  answerQuestion,
  claimMission,
  completeQuiz,
  equip,
  exploreCountry,
  newPlayer,
  purchase,
  startQuiz,
  touchDaily,
  updateAvatar,
  USERNAME_RE,
  viewFigure,
  type EngineResult,
  followTrend,
  submitConnectQuiz,
  answerPrediction,
  claimPrediction,
  type ConnectQuizOutcome,
} from "@/lib/game/engine";
import type { LedgerEntry, PlayerState, Quiz } from "@/lib/types";
import { ApiError, type Backend, type PlayerUpdate } from "./backend";

interface Account {
  id: string;
  email: string;
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
}
interface DB {
  accounts: Account[];
  players: Record<string, PlayerState>;
  ledger: LedgerEntry[];
  session: string | null;
}

const KEY = "worldpulse-demo-db-v1";
let memory: DB | null = null;

function load(): DB {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(KEY);
    memory = raw ? (JSON.parse(raw) as DB) : null;
  } catch {
    memory = null;
  }
  memory ??= { accounts: [], players: {}, ledger: [], session: null };
  return memory;
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* private mode: progress lasts for this tab only */
  }
}

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
async function pbkdf2(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 150_000 }, key, 256);
  return b64(bits);
}

const anchor = new Date(Math.floor(Date.now() / 3600_000) * 3600_000);
const content = buildDemoContent(anchor);
const QUIZZES = new Map<string, Quiz>(content.quizzes.map((q) => [q.id, q]));

function requireUser(): string {
  const db = load();
  if (!db.session || !db.players[db.session]) throw new ApiError("Please log in.", 401, "unauthenticated");
  return db.session;
}

function mutate<T extends EngineResult>(fn: (p: PlayerState, now: Date) => T): T & { state: PlayerState } {
  const db = load();
  const uid = requireUser();
  const now = new Date();
  const daily = touchDaily(db.players[uid], now);
  const r = fn(daily.state, now);
  db.players[uid] = r.state;
  db.ledger.push(...daily.ledger, ...r.ledger);
  db.ledger = db.ledger.slice(-2000);
  save();
  r.events.achievements = [...daily.events.achievements, ...r.events.achievements];
  r.events.coins += daily.events.coins;
  r.events.xp += daily.events.xp;
  return r;
}

const update = async (fn: (p: PlayerState, now: Date) => EngineResult): Promise<PlayerUpdate> => {
  try {
    const r = mutate(fn);
    return { player: r.state, events: r.events };
  } catch (e) {
    throw e instanceof ApiError ? e : new ApiError((e as Error).message, 400, "error");
  }
};

const quizOf = (id: string) => {
  const q = QUIZZES.get(id);
  if (!q) throw new ApiError("Quiz not found.", 404, "not_found");
  return q;
};

const guard = async <T,>(f: () => T | Promise<T>): Promise<T> => {
  try {
    return await f();
  } catch (e) {
    throw e instanceof ApiError ? e : new ApiError((e as Error).message, 400, "error");
  }
};

const demoTrends = () => toPublicTrends(buildDemoTrends(content.events, anchor), content.events);
const demoTrend = (id: string) => {
  const t = demoTrends().find((x) => x.id === id);
  if (!t) throw new ApiError("That trend does not exist.", 404, "not_found");
  return t;
};

export const browserBackend: Backend = {
  kind: "browser",
  async me() {
    const db = load();
    if (!db.session) return null;
    const acct = db.accounts.find((a) => a.id === db.session);
    if (!acct) return null;
    const r = mutate((p) => ({ state: p, ledger: [], events: { achievements: [], coins: 0, xp: 0 } }));
    return { user: { username: acct.username, email: acct.email, createdAt: acct.createdAt }, player: r.state, events: r.events, backend: "browser" };
  },
  async news() {
    const maxCoins: Record<string, number> = {};
    for (const e of content.events) {
      const n = QUIZZES.get(e.quizId)?.questions.length ?? 0;
      if (n) maxCoins[e.id] = n * REWARDS.coinsPerCorrect + REWARDS.perfectBonusCoins;
    }
    return { mode: "demo", updatedAt: anchor.toISOString(), events: content.events, maxCoins, trends: demoTrends() };
  },
  async signup(email, username, password) {
    const db = load();
    email = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError("Enter a valid email address.", 400, "invalid_input");
    if (!USERNAME_RE.test(username)) throw new ApiError("Usernames are 3 to 20 letters, numbers, dots, dashes or underscores.", 400, "bad_username");
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) throw new ApiError("Use at least 8 characters with a letter and a number.", 400, "weak_password");
    if (db.accounts.some((a) => a.email === email)) throw new ApiError("An account with this email already exists.", 409, "email_taken");
    if (db.accounts.some((a) => a.username.toLowerCase() === username.toLowerCase())) throw new ApiError("That username is taken.", 409, "username_taken");
    const id = crypto.randomUUID();
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    db.accounts.push({ id, email, username, salt, hash: await pbkdf2(password, salt), createdAt: new Date().toISOString() });
    const created = newPlayer(id, username, new Date());
    db.players[id] = created.state;
    db.ledger.push(...created.ledger);
    db.session = id;
    save();
    return { needsConfirmation: false };
  },
  async login(identifier, password) {
    const db = load();
    const id = identifier.trim().toLowerCase();
    const acct = db.accounts.find((a) => a.email === id || a.username.toLowerCase() === id);
    if (!acct || (await pbkdf2(password, acct.salt)) !== acct.hash) throw new ApiError("Email/username or password is incorrect.", 401, "bad_credentials");
    db.session = acct.id;
    save();
  },
  async logout() {
    load().session = null;
    save();
  },
  async forgot() {
    return { message: "This offline demo keeps accounts only in this browser, so there is no email to send. Create a new account if you forgot your password." };
  },
  async reset() {
    throw new ApiError("Password reset is not available in the offline demo.", 400, "unsupported");
  },
  async confirmEmail() {
    throw new ApiError("Email confirmation is not used in the offline demo.", 400, "unsupported");
  },
  async pendingSignup() {
    return "none" as const;
  },
  startQuiz: (quizId) =>
    guard(() => {
      const quiz = quizOf(quizId);
      const r = mutate((p, now) => startQuiz(p, quiz, now));
      return {
        quiz: { id: quiz.id, eventId: quiz.eventId, questions: quiz.questions.map(({ id, type, prompt, choices, countryIds, figureIds }) => ({ id, type, prompt, choices, countryIds, figureIds })) },
        resumed: r.resumed,
        player: r.state,
        replay: !!r.state.quizRecords[quiz.id],
      };
    }),
  answer: (quizId, index, choice) =>
    guard(() => {
      const quiz = quizOf(quizId);
      const r = mutate((p, now) => answerQuestion(p, quiz, index, choice, now));
      return { correct: r.correct, answerIndex: r.answerIndex, explanation: r.explanation, context: r.context, locked: r.locked };
    }),
  completeQuiz: (quizId) =>
    guard(() => {
      const quiz = quizOf(quizId);
      const r = mutate((p, now) => completeQuiz(p, quiz, quiz.category, now));
      return { player: r.state, events: r.events, correct: r.correct, total: r.total, perfect: r.perfect, firstCompletion: r.firstCompletion, coins: r.attempt.coins, xp: r.attempt.xp, results: r.results };
    }),
  buy: (itemId) => update((p, now) => purchase(p, itemId, now)),
  equip: (slot, itemId) => update((p, now) => equip(p, itemId, slot, now)),
  followTrend: (trendId, follow) => update((p, now) => followTrend(p, demoTrend(trendId), follow, now)),
  async trendQuiz(trendId, answers) {
    let out: ConnectQuizOutcome | null = null;
    const r = await update((p, now) => (out = submitConnectQuiz(p, demoTrend(trendId), demoTrends(), answers, now)));
    const o = out as unknown as ConnectQuizOutcome;
    return { ...r, correct: o.correct, total: o.total, coins: o.coins, xp: o.xp, results: o.results };
  },
  predict: (trendId, predictionId, choice) => update((p, now) => answerPrediction(p, demoTrend(trendId), predictionId, choice, now)),
  claimPrediction: (trendId, predictionId) => update((p, now) => claimPrediction(p, demoTrend(trendId), predictionId, now)),
  explore: (countryId) => update((p, now) => exploreCountry(p, countryId, now)),
  viewFigure: (figureId) => update((p, now) => viewFigure(p, figureId, FIGURE_IDS, now)),
  claimMission: (missionId) => update((p, now) => claimMission(p, missionId, now)),
  updateAvatar: (avatar) => update((p, now) => updateAvatar(p, avatar, now)),
  async ledger() {
    const db = load();
    const uid = requireUser();
    return db.ledger
      .filter((l) => l.userId === uid)
      .slice(-50)
      .reverse();
  },
};

