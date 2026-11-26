import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/server/crypto";
import { rateLimit } from "@/lib/server/rateLimit";
import { toPublicQuiz } from "@/lib/server/content";
import { buildDemoContent } from "@/data/demo/events";

describe("passwords", () => {
  it("hashes with a salt and verifies", async () => {
    const h1 = await hashPassword("correct horse 1");
    const h2 = await hashPassword("correct horse 1");
    expect(h1).not.toContain("correct horse");
    expect(h1).not.toBe(h2);
    expect(await verifyPassword("correct horse 1", h1)).toBe(true);
    expect(await verifyPassword("wrong horse 1", h1)).toBe(false);
    expect(await verifyPassword("x", null)).toBe(false);
  });
});

describe("rate limiting", () => {
  it("blocks after the limit within the window", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const r = rateLimit(key, 3, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfter).toBeGreaterThan(0);
  });
});

describe("answer key", () => {
  it("is never sent to the client", () => {
    const q = buildDemoContent(new Date()).quizzes[0];
    const pub = JSON.stringify(toPublicQuiz(q));
    expect(pub).not.toContain("answerIndex");
    expect(pub).not.toContain("explanation");
    expect(pub).not.toContain("evidence");
  });
});

describe("supabase url", () => {
  it("accepts the REST endpoint the dashboard shows and keeps only the project URL", async () => {
    const { normalizeSupabaseUrl } = await import("@/lib/server/env");
    expect(normalizeSupabaseUrl(" https://abc.supabase.co/rest/v1/ ")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("")).toBe("");
  });
});
