import { getContent } from "@/lib/server/content";
import { serverEnv, supabaseConfigured } from "@/lib/server/env";
import { handler, json } from "@/lib/server/http";

export const GET = handler({}, async () => {
  const c = await getContent();
  return json({
    ok: true,
    database: supabaseConfigured() ? "supabase" : "local-file",
    news: { mode: c.mode, events: c.events.length, updatedAt: c.updatedAt },
    summarizer: serverEnv.anthropicKey ? "configured" : "not configured",
  });
});
