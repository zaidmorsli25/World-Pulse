import "server-only";

/**
 * Supabase client libraries expect the bare project URL (https://<ref>.supabase.co). The dashboard
 * also shows the REST endpoint (…/rest/v1/), which is easy to paste by mistake, so keep only the origin.
 */
export function normalizeSupabaseUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  try {
    return new URL(v).origin;
  } catch {
    return v;
  }
}

/** Server-side environment. Secrets are read here and never exposed to the client bundle. */
export const serverEnv = {
  supabaseUrl: normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""),
  supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim(),
  supabaseServiceKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
  authSecret: process.env.AUTH_SECRET || "",
  anthropicKey: (process.env.ANTHROPIC_API_KEY || "").trim(),
  anthropicModel: process.env.WP_SUMMARY_MODEL || "claude-opus-5-5",
  cronSecret: (process.env.CRON_SECRET || "").trim(),
  /** "auto" (live when available, else demo), "demo" (always demo), "live" (never show demo). */
  newsMode: (process.env.WP_NEWS_MODE || "auto") as "auto" | "demo" | "live",
  isProd: process.env.NODE_ENV === "production",
  /** Show password-reset links on screen when no email service is configured (local demo only). */
  showDevResetLinks: process.env.WP_SHOW_DEV_RESET_LINKS !== "0" && process.env.NODE_ENV !== "production",
};

export const supabaseConfigured = () => !!(serverEnv.supabaseUrl && serverEnv.supabaseServiceKey && serverEnv.supabaseAnonKey);
