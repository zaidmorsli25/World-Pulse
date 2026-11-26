/**
 * Run the news pipeline once from the command line:  npm run ingest
 * Uses the same store as the app (Supabase if configured, otherwise data/local-db.json).
 */
import { runIngestion } from "../src/lib/news/pipeline";
import { Summarizer } from "../src/lib/news/summarize";
import { LocalStore } from "../src/lib/server/store/local";
import { SupabaseStore } from "../src/lib/server/store/supabase";

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, WP_SUMMARY_MODEL } = process.env;
  const store = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? new SupabaseStore(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : new LocalStore();
  const summarizer = ANTHROPIC_API_KEY ? new Summarizer(ANTHROPIC_API_KEY, WP_SUMMARY_MODEL || "claude-opus-5-5") : null;
  const report = await runIngestion(store, { summarizer, log: console.log });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
