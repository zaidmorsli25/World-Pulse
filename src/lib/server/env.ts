import "server-only";

/** Server-side environment. Secrets are read here and never exposed to the client bundle. */
export const serverEnv = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  authSecret: process.env.AUTH_SECRET || "",
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.WP_SUMMARY_MODEL || "claude-opus-5-5",
  cronSecret: process.env.CRON_SECRET || "",
  /** "auto" (live when available, else demo), "demo" (always demo), "live" (never show demo). */
  newsMode: (process.env.WP_NEWS_MODE || "auto") as "auto" | "demo" | "live",
  isProd: process.env.NODE_ENV === "production",
  /** Show password-reset links on screen when no email service is configured (local demo only). */
  showDevResetLinks: process.env.WP_SHOW_DEV_RESET_LINKS !== "0" && process.env.NODE_ENV !== "production",
};

export const supabaseConfigured = () => !!(serverEnv.supabaseUrl && serverEnv.supabaseServiceKey && serverEnv.supabaseAnonKey);
