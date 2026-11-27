/**
 * File-backed store for local development and demo deployments without a database.
 * Data lives in data/local-db.json. Writes are serialized and atomic (write + rename).
 * Not intended for multi-instance production use: configure Supabase for that.
 */
import fs from "node:fs";
import path from "node:path";
import type { LedgerEntry, PlayerState, QuizAttempt } from "@/lib/types";
import { ConflictError, type LiveNews, type Store, type StoredArticle, type UserRecord } from "./types";

interface DB {
  users: UserRecord[];
  players: Record<string, PlayerState>;
  ledger: LedgerEntry[];
  attempts: QuizAttempt[];
  resetTokens: Record<string, { userId: string; expiresAt: string }>;
  news: LiveNews | null;
  articles: StoredArticle[];
  meta?: Record<string, unknown>;
}

const empty = (): DB => ({ users: [], players: {}, ledger: [], attempts: [], resetTokens: {}, news: null, articles: [] });
const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x));

export class LocalStore implements Store {
  kind = "local" as const;
  private db: DB | null = null;
  private queue: Promise<void> = Promise.resolve();
  constructor(private file = process.env.WP_LOCAL_DB_PATH || path.join(process.cwd(), "data", "local-db.json")) {}

  private load(): DB {
    if (!this.db) {
      try {
        this.db = { ...empty(), ...JSON.parse(fs.readFileSync(this.file, "utf8")) };
      } catch {
        this.db = empty();
      }
    }
    return this.db!;
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.db);
    this.queue = this.queue.then(async () => {
      await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, snapshot, { mode: 0o600 });
      await fs.promises.rename(tmp, this.file);
    });
    return this.queue;
  }

  async findUserByEmail(email: string) {
    const u = this.load().users.find((x) => x.email === email.toLowerCase());
    return u ? copy(u) : null;
  }
  async findUserByUsername(username: string) {
    const u = this.load().users.find((x) => x.username.toLowerCase() === username.toLowerCase());
    return u ? copy(u) : null;
  }
  async getUser(id: string) {
    const u = this.load().users.find((x) => x.id === id);
    return u ? copy(u) : null;
  }
  async createUser(user: UserRecord) {
    const db = this.load();
    if (db.users.some((u) => u.email === user.email || u.username.toLowerCase() === user.username.toLowerCase())) throw new Error("duplicate");
    db.users.push(copy(user));
    await this.persist();
  }
  async setPasswordHash(userId: string, hash: string) {
    const u = this.load().users.find((x) => x.id === userId);
    if (u) u.passwordHash = hash;
    await this.persist();
  }
  async saveResetToken(tokenHash: string, userId: string, expiresAt: string) {
    const db = this.load();
    for (const [k, v] of Object.entries(db.resetTokens)) if (v.userId === userId || Date.parse(v.expiresAt) < Date.now()) delete db.resetTokens[k];
    db.resetTokens[tokenHash] = { userId, expiresAt };
    await this.persist();
  }
  async takeResetToken(tokenHash: string) {
    const db = this.load();
    const t = db.resetTokens[tokenHash];
    if (!t) return null;
    delete db.resetTokens[tokenHash];
    await this.persist();
    return Date.parse(t.expiresAt) > Date.now() ? t.userId : null;
  }

  async loadPlayer(userId: string) {
    const p = this.load().players[userId];
    return p ? copy(p) : null;
  }
  async savePlayer(state: PlayerState, expectedVersion: number, ledger: LedgerEntry[], attempt?: QuizAttempt) {
    const db = this.load();
    const current = db.players[state.userId];
    const currentVersion = current ? current.version : -1;
    if (currentVersion !== expectedVersion) throw new ConflictError();
    db.players[state.userId] = copy(state);
    db.ledger.push(...ledger);
    if (attempt) db.attempts.push(attempt);
    if (db.ledger.length > 50000) db.ledger = db.ledger.slice(-50000);
    if (db.attempts.length > 50000) db.attempts = db.attempts.slice(-50000);
    await this.persist();
  }
  async listLedger(userId: string, limit: number) {
    return this.load()
      .ledger.filter((l) => l.userId === userId)
      .slice(-limit)
      .reverse();
  }

  async getLiveNews() {
    return this.load().news;
  }
  async saveLiveNews(news: LiveNews, articles: StoredArticle[]) {
    const db = this.load();
    db.news = copy(news);
    const seen = new Set(db.articles.map((a) => a.url));
    for (const a of articles) if (!seen.has(a.url)) db.articles.push(a);
    db.articles = db.articles.slice(-5000);
    await this.persist();
  }
  async getMeta<T = unknown>(key: string): Promise<T | null> {
    return ((this.load().meta ?? {})[key] as T) ?? null;
  }
  async setMeta(key: string, value: unknown) {
    const db = this.load();
    db.meta = { ...(db.meta ?? {}) };
    if (value === null) delete db.meta[key];
    else db.meta[key] = copy(value);
    await this.persist();
  }
}
