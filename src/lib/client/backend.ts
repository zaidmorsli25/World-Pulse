// Client-side API. The normal build talks to the Next.js API routes; the standalone demo build
// swaps in an in-browser backend (same game engine, progress saved in this browser only).
import type { PublicTrend } from "@/lib/trends";
import type { AvatarConfig, GameEvents, NewsEvent, PlayerState, PublicQuiz } from "@/lib/types";

export interface Me {
  user: { username: string; email: string; createdAt: string };
  player: PlayerState;
  events: GameEvents;
  backend: "local" | "supabase" | "browser";
}
export interface NewsPayload {
  mode: "live" | "demo";
  updatedAt: string | null;
  events: NewsEvent[];
  /** Coins a perfect first attempt pays, per event id (computed server-side from the quiz). */
  maxCoins?: Record<string, number>;
  /** approved trends linking several stories (demo trends in demo mode) */
  trends?: PublicTrend[];
}
export interface PlayerUpdate {
  player: PlayerState;
  events: GameEvents;
}
export interface AnswerPayload {
  correct: boolean;
  answerIndex: number;
  explanation: string;
  context?: string;
  locked: boolean;
}
export interface CompletePayload extends PlayerUpdate {
  correct: number;
  total: number;
  perfect: boolean;
  firstCompletion: boolean;
  coins: number;
  xp: number;
  results: { correct: boolean; answerIndex: number }[];
}
export interface LedgerRow {
  id: string;
  kind: string;
  coins: number;
  xp: number;
  note: string;
  at: string;
}

export interface Backend {
  kind: "server" | "browser";
  me(): Promise<Me | null>;
  news(): Promise<NewsPayload>;
  signup(email: string, username: string, password: string): Promise<{ needsConfirmation: boolean }>;
  login(identifier: string, password: string): Promise<void>;
  logout(): Promise<void>;
  forgot(email: string): Promise<{ message: string; devLink?: string }>;
  reset(p: { token?: string; accessToken?: string }, password: string): Promise<void>;
  /** Log in with the token from the confirmation email link. */
  confirmEmail(accessToken: string): Promise<void>;
  /** Has the account this browser just created confirmed its email yet? Logs in when it has. */
  pendingSignup(): Promise<"none" | "waiting" | "confirmed">;
  startQuiz(quizId: string): Promise<{ quiz: PublicQuiz; resumed: (number | null)[] | null; player: PlayerState; replay: boolean }>;
  answer(quizId: string, index: number, choice: number): Promise<AnswerPayload>;
  completeQuiz(quizId: string): Promise<CompletePayload>;
  buy(itemId: string): Promise<PlayerUpdate>;
  equip(slot: string, itemId: string | null): Promise<PlayerUpdate>;
  explore(countryId: string): Promise<PlayerUpdate>;
  viewFigure(figureId: string): Promise<PlayerUpdate>;
  claimMission(missionId: string): Promise<PlayerUpdate>;
  updateAvatar(avatar: AvatarConfig): Promise<PlayerUpdate>;
  ledger(): Promise<LedgerRow[]>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0, "network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status, data.code ?? "error");
  return data as T;
}

export const httpBackend: Backend = {
  kind: "server",
  async me() {
    try {
      return await call<Me>("/api/me");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) return null;
      throw e;
    }
  },
  news: () => call("/api/news"),
  signup: (email, username, password) => call("/api/auth/signup", { email, username, password }),
  login: async (identifier, password) => {
    await call("/api/auth/login", { identifier, password });
  },
  logout: async () => {
    await call("/api/auth/logout", {});
  },
  forgot: (email) => call("/api/auth/forgot", { email }),
  reset: async (p, password) => {
    await call("/api/auth/reset", { ...p, password });
  },
  confirmEmail: async (accessToken) => {
    await call("/api/auth/confirm", { accessToken });
  },
  pendingSignup: async () => (await call<{ status: "none" | "waiting" | "confirmed" }>("/api/auth/pending", {})).status,
  startQuiz: (quizId) => call("/api/quiz/start", { quizId }),
  answer: (quizId, index, choice) => call("/api/quiz/answer", { quizId, index, choice }),
  completeQuiz: (quizId) => call("/api/quiz/complete", { quizId }),
  buy: (itemId) => call("/api/shop/buy", { itemId }),
  equip: (slot, itemId) => call("/api/shop/equip", { slot, itemId }),
  explore: (countryId) => call("/api/explore", { countryId }),
  viewFigure: (figureId) => call("/api/figures/view", { figureId }),
  claimMission: (missionId) => call("/api/missions/claim", { missionId }),
  updateAvatar: (avatar) => call("/api/profile/avatar", { avatar }),
  ledger: async () => (await call<{ entries: LedgerRow[] }>("/api/ledger")).entries,
};

let backendPromise: Promise<Backend> | null = null;
export function getBackend(): Promise<Backend> {
  if (!backendPromise) {
    backendPromise =
      process.env.NEXT_PUBLIC_STANDALONE === "1" ? import("./browserBackend").then((m) => m.browserBackend) : Promise.resolve(httpBackend);
  }
  return backendPromise;
}
