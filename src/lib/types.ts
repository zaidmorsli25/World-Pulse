// Shared domain types for WorldPulse. Used by the client, the server and the news pipeline.

export const CATEGORIES = [
  "conflict",
  "election",
  "diplomacy",
  "economy",
  "trade",
  "energy",
  "organizations",
  "security",
  "technology",
  "sanctions",
  "humanitarian",
  "leadership",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const TIERS = ["minor", "notable", "significant", "major", "global"] as const;
export type Tier = (typeof TIERS)[number];

export const REGIONS = ["Africa", "Americas", "Asia", "Europe", "Oceania", "Antarctic"] as const;
export type Region = (typeof REGIONS)[number];

/** The only six publications WorldPulse may use for current-events reporting. */
export const APPROVED_PUBLICATIONS = ["Bloomberg", "BBC News", "The Wall Street Journal", "Reuters", "NPR", "The New York Times"] as const;
export type Publication = (typeof APPROVED_PUBLICATIONS)[number];

/** How certain a statement in a briefing is. Shown to players as a small label. */
export type ClaimKind = "fact" | "allegation" | "disputed" | "opinion" | "prediction";

export interface Claim {
  text: string;
  kind: ClaimKind;
  /** ids of SourceRef entries that support the claim (live events). */
  sources?: string[];
}

export interface SourceRef {
  id: string;
  /** An approved publication, or "Demo" for clearly-labelled illustrative content. */
  publication: Publication | "Demo";
  headline: string;
  url: string | null;
  publishedAt: string; // ISO
}

export interface Involved {
  name: string;
  kind: "country" | "figure" | "organization" | "group";
  /** country id (ISO3) or figure id when kind is country/figure */
  ref?: string;
  role: string;
}

export interface ImportanceBreakdown {
  coverage: number; // 0..1  distinct approved outlets
  prominence: number; // 0..1 frequency / placement
  consequences: number; // 0..1 international consequences
  recency: number; // 0..1
  significance: number; // 0..1 economic / humanitarian / diplomatic / political
}

export interface Importance {
  score: number; // 0..100
  tier: Tier;
  breakdown: ImportanceBreakdown;
}

export interface Briefing {
  whatHappened: Claim[];
  background: Claim[];
  involved: Involved[];
  whyItMatters: Claim[];
  whatNext: Claim[];
  readingMinutes: number;
}

export interface NewsEvent {
  id: string;
  title: string;
  category: Category;
  countries: string[]; // ISO3 ids, first = primary location
  figures: string[]; // figure ids
  location: { lat: number; lng: number };
  region: Region;
  eventDate: string; // ISO date the event happened
  updatedAt: string; // ISO time WorldPulse last updated the event
  importance: Importance;
  isDemo: boolean;
  briefing: Briefing;
  sources: SourceRef[];
  quizId: string;
}

export type QuestionType = "multiple_choice" | "true_false" | "country_id" | "figure_id" | "cause_effect" | "map";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  context?: string;
  /** For map / country_id questions: the country id for each choice (same order as choices). */
  countryIds?: string[];
  /** For figure_id questions: the figure id for each choice. */
  figureIds?: string[];
  /** Quote from the briefing that proves the answer. Used by the validator. */
  evidence: string;
}

export interface Quiz {
  id: string;
  eventId: string;
  category: Category;
  questions: QuizQuestion[];
}

/** What the client receives: never the answer key. */
export type PublicQuizQuestion = Omit<QuizQuestion, "answerIndex" | "explanation" | "context" | "evidence">;
export interface PublicQuiz {
  id: string;
  eventId: string;
  questions: PublicQuizQuestion[];
}

// ---------------------------------------------------------------- players

export type Slot =
  | "outfit"
  | "headwear"
  | "accessory"
  | "background"
  | "desk"
  | "wallmap"
  | "monitor"
  | "bookshelf"
  | "flag"
  | "globe"
  | "display";

export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary"] as const;
export type Rarity = (typeof RARITIES)[number];

export interface AvatarConfig {
  skin: number; // index into palette
  hair: number; // style index
  hairColor: number;
  backdrop: number;
}

export interface QuizRecord {
  bestCorrect: number;
  total: number;
  attempts: number;
  perfect: boolean;
  coinsAwarded: number;
  xpAwarded: number;
  firstCompletedAt: string;
  lastAttemptAt: string;
}

export interface DailyCounters {
  day: string; // YYYY-MM-DD (UTC)
  briefingsCompleted: number;
  newCountries: number;
  diplomacyQuizzes: number;
  perfectQuizzes: number;
  continents: string[];
  figuresViewed: number;
  economyBriefings: number;
  correctAnswers: number;
}

export interface MissionState {
  day: string;
  ids: string[];
  claimed: string[];
}

export interface PlayerState {
  userId: string;
  username: string;
  avatar: AvatarConfig;
  coins: number;
  xp: number;
  streak: { count: number; best: number; lastActiveDay: string | null; shields: number };
  quizRecords: Record<string, QuizRecord>;
  inventory: string[];
  equipped: Partial<Record<Exclude<Slot, "display">, string>> & { display?: string[] };
  achievements: Record<string, string>; // id -> unlockedAt
  countriesExplored: string[];
  figuresViewed: string[];
  briefingsRead: string[];
  categoryQuizzes: Partial<Record<Category, number>>;
  daily: DailyCounters;
  missions: MissionState;
  stats: { quizzesCompleted: number; perfectQuizzes: number; correctAnswers: number; questionsAnswered: number };
  /** The quiz in progress. The first answer to each question is locked in server-side. */
  pendingQuiz?: { quizId: string; answers: (number | null)[] } | null;
  createdAt: string;
  version: number;
}

export type LedgerKind = "quiz" | "explore" | "purchase" | "mission" | "achievement" | "streak" | "signup";

export interface LedgerEntry {
  id: string;
  userId: string;
  kind: LedgerKind;
  coins: number;
  xp: number;
  ref: string | null;
  note: string;
  at: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  eventId: string;
  answers: number[];
  correct: number;
  total: number;
  coins: number;
  xp: number;
  at: string;
}

/** Notifications the engine returns so the UI can celebrate. */
export interface GameEvents {
  levelUp?: { from: number; to: number };
  rankUp?: { from: string; to: string };
  achievements: string[];
  coins: number;
  xp: number;
}
