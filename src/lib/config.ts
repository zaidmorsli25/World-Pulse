// Tunable game configuration. Everything that affects the economy lives here so it can be
// adjusted without touching game logic. Values can be overridden through environment variables
// on the server (see .env.example).

const num = (v: string | undefined, d: number) => (v !== undefined && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : d);
const env = typeof process !== "undefined" ? process.env : ({} as Record<string, string | undefined>);

export const REWARDS = {
  coinsPerCorrect: num(env.WP_COINS_PER_CORRECT, 20),
  xpPerCorrect: num(env.WP_XP_PER_CORRECT, 10),
  perfectBonusCoins: num(env.WP_PERFECT_BONUS_COINS, 25),
  perfectBonusXp: num(env.WP_PERFECT_BONUS_XP, 25),
  /** Only the first completed attempt pays; replays are practice. */
  replayCoins: 0,
  replayXp: 0,
  signupCoins: num(env.WP_SIGNUP_COINS, 150),
  streakDailyCoins: num(env.WP_STREAK_DAILY_COINS, 10),
  exploreCountryXp: 2,
};

/**
 * Importance model weights (must sum to 1). See docs/IMPORTANCE.md.
 * 35% coverage by distinct approved outlets, 20% prominence/frequency, 20% international
 * consequences, 15% recency, 10% economic/humanitarian/diplomatic/political significance.
 */
export const IMPORTANCE_WEIGHTS = {
  coverage: num(env.WP_W_COVERAGE, 0.35),
  prominence: num(env.WP_W_PROMINENCE, 0.2),
  consequences: num(env.WP_W_CONSEQUENCES, 0.2),
  recency: num(env.WP_W_RECENCY, 0.15),
  significance: num(env.WP_W_SIGNIFICANCE, 0.1),
};

/** Score floor for each tier (0..100). */
export const TIER_THRESHOLDS = { minor: 0, notable: 30, significant: 48, major: 64, global: 80 } as const;

/** Humanitarian events get a floor so low media coverage does not bury them. */
export const HUMANITARIAN_FLOOR = 40;

export const RANKS = [
  { name: "Recruit", level: 1, icon: "🎖️" },
  { name: "Observer", level: 3, icon: "🔭" },
  { name: "Researcher", level: 5, icon: "📚" },
  { name: "Junior Analyst", level: 8, icon: "📊" },
  { name: "Intelligence Analyst", level: 11, icon: "🛰️" },
  { name: "Diplomatic Officer", level: 15, icon: "🤝" },
  { name: "Ambassador", level: 19, icon: "🏛️" },
  { name: "Senior Strategist", level: 24, icon: "♟️" },
  { name: "Geopolitical Expert", level: 30, icon: "🌐" },
  { name: "Global Strategist", level: 37, icon: "👑" },
] as const;

/** XP needed to go from `level` to `level + 1`. Grows with level so higher ranks take longer. */
export const xpToNext = (level: number) => 100 + 30 * (level - 1);

export const MAX_LEVEL = 60;

export const NEWS = {
  refreshMinutes: num(env.WP_NEWS_REFRESH_MINUTES, 60),
  maxArticleAgeHours: num(env.WP_NEWS_MAX_AGE_HOURS, 72),
  maxEvents: num(env.WP_NEWS_MAX_EVENTS, 40),
  /** Seconds a scheduled run may spend starting new briefings (keeps it inside the host's time limit). */
  ingestBudgetSeconds: num(env.WP_INGEST_BUDGET_SECONDS, 170),
  /** Briefings generated in parallel. */
  ingestConcurrency: num(env.WP_INGEST_CONCURRENCY, 4),
  /** A story with new reporting keeps its briefing until the briefing is this many hours old. */
  rewriteAfterHours: num(env.WP_NEWS_REWRITE_AFTER_HOURS, 24),
};
