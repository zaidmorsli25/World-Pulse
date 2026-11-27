/**
 * Supabase (PostgreSQL) store. Used when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.
 * Runs only on the server with the service-role key; the key is never sent to the browser.
 * Player state is loaded and saved through the wp_load_player / wp_save_player SQL functions
 * (see supabase/migrations/0001_worldpulse.sql) so each save is a single transaction.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LedgerEntry, NewsEvent, PlayerState, Quiz, QuizAttempt } from "@/lib/types";
import { ConflictError, type LiveNews, type Store, type StoredArticle, type UserRecord } from "./types";

export class SupabaseStore implements Store {
  kind = "supabase" as const;
  readonly db: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  private async userFromProfile(row: { id: string; username: string; created_at: string } | null): Promise<UserRecord | null> {
    if (!row) return null;
    const { data } = await this.db.auth.admin.getUserById(row.id);
    return { id: row.id, username: row.username, email: data.user?.email ?? "", passwordHash: null, createdAt: row.created_at };
  }

  async findUserByEmail(email: string) {
    // Supabase Auth owns emails; look the user up through the admin API.
    const { data, error } = await this.db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (!u) return null;
    const { data: prof } = await this.db.from("profiles").select("id, username, created_at").eq("id", u.id).maybeSingle();
    return prof ? { id: u.id, email: u.email ?? email, username: prof.username, passwordHash: null, createdAt: prof.created_at } : null;
  }
  async findUserByUsername(username: string) {
    const { data } = await this.db.from("profiles").select("id, username, created_at").ilike("username", username).maybeSingle();
    return this.userFromProfile(data);
  }
  async getUser(id: string) {
    const { data } = await this.db.from("profiles").select("id, username, created_at").eq("id", id).maybeSingle();
    return this.userFromProfile(data);
  }
  async createUser() {
    // Users are created by Supabase Auth (see auth.ts); the profile row is created on first save.
  }
  async setPasswordHash() {
    throw new Error("Passwords are managed by Supabase Auth.");
  }
  async saveResetToken(tokenHash: string, userId: string, expiresAt: string) {
    await this.db.from("password_reset_tokens").upsert({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt });
  }
  async takeResetToken(tokenHash: string) {
    const { data } = await this.db.from("password_reset_tokens").delete().eq("token_hash", tokenHash).select().maybeSingle();
    return data && Date.parse(data.expires_at) > Date.now() ? (data.user_id as string) : null;
  }

  async loadPlayer(userId: string) {
    const { data, error } = await this.db.rpc("wp_load_player", { p_user: userId });
    if (error) throw error;
    return (data as PlayerState | null) ?? null;
  }
  async savePlayer(state: PlayerState, expectedVersion: number, ledger: LedgerEntry[], attempt?: QuizAttempt) {
    const { data, error } = await this.db.rpc("wp_save_player", { p_state: state, p_expected: expectedVersion, p_ledger: ledger, p_attempt: attempt ?? null });
    if (error) throw error;
    if (data !== true) throw new ConflictError();
  }
  async listLedger(userId: string, limit: number): Promise<LedgerEntry[]> {
    const { data } = await this.db.from("currency_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
    return (data ?? []).map((r) => ({ id: r.id, userId, kind: r.kind, coins: r.coins, xp: 0, ref: r.ref, note: r.note, at: r.created_at }));
  }

  async getLiveNews(): Promise<LiveNews | null> {
    const { data: events, error } = await this.db.from("news_events").select("*, event_sources(*)").eq("active", true).eq("is_demo", false).order("importance_score", { ascending: false }).limit(200);
    if (error) throw error;
    if (!events?.length) return null;
    const quizIds = events.map((e) => e.quiz_id).filter(Boolean);
    const { data: qs } = await this.db.from("quizzes").select("*, quiz_questions(*)").in("id", quizIds);
    const { data: meta } = await this.db.from("app_meta").select("value").eq("key", "news_updated_at").maybeSingle();
    return {
      updatedAt: (meta?.value as string) ?? null,
      events: events.map(
        (e): NewsEvent => ({
          id: e.id,
          title: e.title,
          category: e.category,
          countries: e.countries,
          figures: e.figures,
          location: { lat: e.lat, lng: e.lng },
          region: e.region,
          eventDate: e.event_date,
          updatedAt: e.updated_at,
          importance: { score: e.importance_score, tier: e.importance_tier, breakdown: e.importance_breakdown },
          isDemo: false,
          briefing: e.briefing,
          sources: (e.event_sources ?? []).map((s: Record<string, string>) => ({ id: s.id, publication: s.publication, headline: s.headline, url: s.url, publishedAt: s.published_at })),
          quizId: e.quiz_id,
        }),
      ),
      quizzes: (qs ?? []).map(
        (q): Quiz => ({
          id: q.id,
          eventId: q.event_id,
          category: q.category,
          questions: [...(q.quiz_questions ?? [])]
            .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
            .map((x: Record<string, unknown>) => ({
              id: x.id as string,
              type: x.type as Quiz["questions"][number]["type"],
              prompt: x.prompt as string,
              choices: x.choices as string[],
              answerIndex: x.answer_index as number,
              explanation: x.explanation as string,
              context: (x.context as string) ?? undefined,
              countryIds: (x.country_ids as string[]) ?? undefined,
              figureIds: (x.figure_ids as string[]) ?? undefined,
              evidence: x.evidence as string,
            })),
        }),
      ),
    };
  }

  async saveLiveNews(news: LiveNews, articles: StoredArticle[]) {
    const db = this.db;
    if (articles.length) {
      const { error } = await db.from("news_articles").upsert(
        articles.map((a) => ({ id: a.id, publication: a.publication, headline: a.headline, url: a.url, feed_summary: a.summary, published_at: a.publishedAt, feed: a.feed, event_id: a.eventId, fetched_at: a.fetchedAt })),
        { onConflict: "url", ignoreDuplicates: true },
      );
      if (error) throw error;
    }
    // Deactivate events that dropped out of the current set, then upsert the new set.
    await db.from("news_events").update({ active: false }).eq("is_demo", false);
    for (const e of news.events) {
      const { error } = await db.from("news_events").upsert({
        id: e.id, title: e.title, category: e.category, countries: e.countries, figures: e.figures, lat: e.location.lat, lng: e.location.lng,
        region: e.region, event_date: e.eventDate, updated_at: e.updatedAt, importance_score: e.importance.score, importance_tier: e.importance.tier,
        importance_breakdown: e.importance.breakdown, briefing: e.briefing, is_demo: false, quiz_id: e.quizId, active: true,
      });
      if (error) throw error;
      await db.from("event_sources").delete().eq("event_id", e.id);
      await db.from("event_sources").insert(e.sources.map((s) => ({ id: `${e.id}:${s.id}`, event_id: e.id, publication: s.publication, headline: s.headline, url: s.url, published_at: s.publishedAt })));
    }
    for (const q of news.quizzes) {
      await db.from("quizzes").upsert({ id: q.id, event_id: q.eventId, category: q.category, validated_at: new Date().toISOString() });
      await db.from("quiz_questions").delete().eq("quiz_id", q.id);
      await db.from("quiz_questions").insert(
        q.questions.map((x, i) => ({
          id: x.id, quiz_id: q.id, position: i, type: x.type, prompt: x.prompt, choices: x.choices, answer_index: x.answerIndex,
          explanation: x.explanation, context: x.context ?? null, country_ids: x.countryIds ?? null, figure_ids: x.figureIds ?? null, evidence: x.evidence,
        })),
      );
    }
    await db.from("app_meta").upsert({ key: "news_updated_at", value: news.updatedAt, updated_at: new Date().toISOString() });
  }

  async getMeta<T = unknown>(key: string): Promise<T | null> {
    const { data, error } = await this.db.from("app_meta").select("value").eq("key", key).maybeSingle();
    if (error) throw error;
    return (data?.value as T) ?? null;
  }
  async setMeta(key: string, value: unknown) {
    const { error } = value === null
      ? await this.db.from("app_meta").delete().eq("key", key)
      : await this.db.from("app_meta").upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
}
