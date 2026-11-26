import { getContent } from "@/lib/server/content";
import { serverEnv, supabaseConfigured } from "@/lib/server/env";
import { handler, json } from "@/lib/server/http";
import { getStore } from "@/lib/server/store";

export const GET = handler({}, async () => {
  const c = await getContent();
  // Check the database is actually reachable, not just configured (errors here are otherwise
  // hidden by the demo-content fallback).
  let databaseStatus = "ok";
  try {
    await getStore().getLiveNews();
  } catch (e) {
    const err = e as { code?: string };
    databaseStatus = `error${err.code ? ` (${err.code})` : ""}`;
  }
  return json({
    ok: databaseStatus === "ok",
    database: supabaseConfigured() ? "supabase" : "local-file",
    databaseStatus,
    news: { mode: c.mode, events: c.events.length, updatedAt: c.updatedAt },
    summarizer: serverEnv.anthropicKey ? "configured" : "not configured",
  });
});
