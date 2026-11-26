import type { LedgerEntry, NewsEvent, PlayerState, Quiz, QuizAttempt } from "@/lib/types";

export interface UserRecord {
  id: string;
  email: string;
  username: string;
  /** scrypt hash (local auth only). Null when Supabase Auth manages the password. */
  passwordHash: string | null;
  createdAt: string;
}

/** Raw article metadata kept from approved feeds (headline, link, date and feed summary only; never full text). */
export interface StoredArticle {
  id: string;
  publication: string;
  headline: string;
  url: string;
  summary: string;
  publishedAt: string;
  feed: string;
  eventId: string | null;
  fetchedAt: string;
}

export interface LiveNews {
  events: NewsEvent[];
  quizzes: Quiz[];
  updatedAt: string | null;
}

export class ConflictError extends Error {
  constructor() {
    super("Your progress changed in another tab. Please try again.");
  }
}

export interface Store {
  kind: "local" | "supabase";
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findUserByUsername(username: string): Promise<UserRecord | null>;
  getUser(id: string): Promise<UserRecord | null>;
  createUser(user: UserRecord): Promise<void>;
  setPasswordHash(userId: string, hash: string): Promise<void>;
  saveResetToken(tokenHash: string, userId: string, expiresAt: string): Promise<void>;
  /** Returns the user id if the token is valid and unexpired, and deletes it (single use). */
  takeResetToken(tokenHash: string): Promise<string | null>;

  loadPlayer(userId: string): Promise<PlayerState | null>;
  /** Saves only if the stored version equals `expectedVersion` (-1 for a new player). Optimistic concurrency. */
  savePlayer(state: PlayerState, expectedVersion: number, ledger: LedgerEntry[], attempt?: QuizAttempt): Promise<void>;
  listLedger(userId: string, limit: number): Promise<LedgerEntry[]>;

  getLiveNews(): Promise<LiveNews | null>;
  saveLiveNews(news: LiveNews, articles: StoredArticle[]): Promise<void>;
}
