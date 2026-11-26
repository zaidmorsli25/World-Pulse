import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { GameError } from "@/lib/game/engine";
import { ConflictError } from "./store/types";
import { rateLimit } from "./rateLimit";
import { getSessionUserId } from "./session";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init, headers: { "Cache-Control": "no-store" } } : { headers: { "Cache-Control": "no-store" }, ...init });

const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";

interface Options<S extends z.ZodTypeAny> {
  auth?: boolean;
  body?: S;
  /** requests per minute per IP for this route */
  limit?: number;
}

type Ctx<S extends z.ZodTypeAny> = { req: NextRequest; userId: string | null; body: z.infer<S> };

/**
 * Wraps a route handler with: same-origin checks for state-changing requests (CSRF defence in
 * addition to SameSite cookies), per-IP rate limiting, session auth, zod input validation and
 * consistent error handling that never leaks internals.
 */
export function handler<S extends z.ZodTypeAny = z.ZodUndefined>(opts: Options<S>, fn: (ctx: Ctx<S>) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      if (req.method !== "GET") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
        if (origin && host && new URL(origin).host !== host) throw new HttpError(403, "Cross-site request blocked.", "csrf");
      }
      const rl = rateLimit(`${req.nextUrl.pathname}:${clientIp(req)}`, opts.limit ?? 120, 60_000);
      if (!rl.ok) return json({ error: "Too many requests. Please slow down.", code: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });
      const userId = await getSessionUserId();
      if (opts.auth && !userId) throw new HttpError(401, "Please log in.", "unauthenticated");
      let body: unknown = undefined;
      if (opts.body) {
        if (!(req.headers.get("content-type") || "").includes("application/json")) throw new HttpError(415, "Expected JSON.", "bad_content_type");
        const raw = await req.json().catch(() => {
          throw new HttpError(400, "Invalid JSON.", "bad_json");
        });
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input.", "invalid_input");
        body = parsed.data;
      }
      return await fn({ req, userId, body: body as z.infer<S> });
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, code: e.code }, e.status);
      if (e instanceof GameError) return json({ error: e.message, code: e.code }, e.status);
      if (e instanceof ConflictError) return json({ error: e.message, code: "conflict" }, 409);
      console.error("[api]", req.nextUrl.pathname, e);
      return json({ error: "Something went wrong on our side. Please try again.", code: "server_error" }, 500);
    }
  };
}
