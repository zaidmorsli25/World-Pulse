import "server-only";
import { timingSafeEqual } from "node:crypto";
import { sha256 } from "./crypto";
import { serverEnv } from "./env";
import { HttpError } from "./http";

/** Scheduled jobs authenticate with `Authorization: Bearer $CRON_SECRET`. */
export function requireCronSecret(req: Request) {
  const given = Buffer.from(sha256(req.headers.get("authorization") ?? ""), "hex");
  const expected = Buffer.from(sha256(`Bearer ${serverEnv.cronSecret}`), "hex");
  if (!serverEnv.cronSecret || !timingSafeEqual(given, expected)) throw new HttpError(401, "Unauthorized.", "unauthorized");
}

/** Only the scheduler (which holds CRON_SECRET) sees this, so report the cause of a failure. */
export function describeError(e: unknown): string {
  const err = e as { message?: string; code?: string; details?: string; hint?: string };
  return [err?.message, err?.code, err?.details, err?.hint].filter(Boolean).join(" | ") || String(e);
}
