import "server-only";
import { serverEnv, supabaseConfigured } from "../env";
import { LocalStore } from "./local";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

const g = globalThis as unknown as { __wpStore?: Store };

export function getStore(): Store {
  if (!g.__wpStore) {
    g.__wpStore = supabaseConfigured() ? new SupabaseStore(serverEnv.supabaseUrl, serverEnv.supabaseServiceKey) : new LocalStore();
  }
  return g.__wpStore;
}
