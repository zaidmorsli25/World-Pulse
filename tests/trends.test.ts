import { describe, expect, it } from "vitest";
import { buildDemoContent } from "@/data/demo/events";
import { buildDemoTrends } from "@/data/demo/trends";
import { retireQuietTrends, slugify, toPublicTrends, trendProblems, trendsForEvent, TREND_RULES, type Trend, type TrendLink } from "@/lib/trends";

const now = new Date("2026-11-27T12:00:00Z");
const link = (eventId: string, country: string, extra: Partial<TrendLink> = {}): TrendLink => ({
  eventId,
  kind: "direct",
  label: "Fuel prices",
  note: "Higher fuel prices hit this story directly.",
  source: { publication: "Reuters", headline: "A headline", url: "https://www.reuters.com/x" },
  addedAt: now.toISOString(),
  eventTitle: eventId,
  eventDate: "2026-11-20",
  country,
  ...extra,
});
const trend = (id: string, links: TrendLink[], extra: Partial<Trend> = {}): Trend => ({
  id,
  name: id,
  color: "#ff4d8d",
  status: "active",
  cause: "One named cause.",
  summary: ["A big-picture paragraph about it."],
  timeline: [],
  links,
  createdAt: now.toISOString(),
  lastStoryAt: now.toISOString(),
  ...extra,
});

describe("trend rules", () => {
  it("needs 3 stories in 2 countries", () => {
    expect(trendProblems(trend("a", [link("e1", "USA"), link("e2", "USA")]), [])).toEqual(expect.arrayContaining([expect.stringContaining("at least 3 stories"), expect.stringContaining("at least 2 countries")]));
    expect(trendProblems(trend("a", [link("e1", "USA"), link("e2", "MEX"), link("e3", "USA")]), [])).toEqual([]);
  });

  it("needs a source link for real outlets and a note for every link", () => {
    const t = trend("a", [link("e1", "USA", { source: { publication: "BBC News", headline: "h", url: null } }), link("e2", "MEX", { note: " " }), link("e3", "CAN")]);
    const p = trendProblems(t, []);
    expect(p).toContain("link to e1 has no source");
    expect(p).toContain("link to e2 has no explanation");
  });

  it("lets a story belong to at most 2 active trends", () => {
    const ls = [link("e1", "USA"), link("e2", "MEX"), link("e3", "CAN")];
    const others = [trend("b", ls), trend("c", ls), trend("d", ls, { status: "draft" })];
    expect(TREND_RULES.maxTrendsPerStory).toBe(2);
    expect(trendProblems(trend("a", ls), others).some((x) => x.includes("already in 2 other trends"))).toBe(true);
    expect(trendProblems(trend("a", ls), others.slice(1))).toEqual([]);
  });

  it("retires trends with no new story for 14 days", () => {
    const old = trend("a", [], { lastStoryAt: new Date(now.getTime() - 15 * 86400_000).toISOString() });
    const fresh = trend("b", [], { lastStoryAt: new Date(now.getTime() - 13 * 86400_000).toISOString() });
    expect(retireQuietTrends([old, fresh], now)).toBe(true);
    expect(old.status).toBe("retired");
    expect(fresh.status).toBe("active");
  });

  it("never shows drafts to players and marks which stories are on the map", () => {
    const ls = [link("e1", "USA"), link("e2", "MEX"), link("e3", "CAN")];
    const pub = toPublicTrends([trend("a", ls), trend("d", ls, { status: "draft" })], [{ id: "e1" }, { id: "e2" }] as never);
    expect(pub.map((t) => t.id)).toEqual(["a"]);
    expect(pub[0].links.map((l) => l.live)).toEqual([true, true, false]);
    expect(trendsForEvent(pub, "e3")).toEqual([]);
    expect(trendsForEvent(pub, "e1").map((t) => t.id)).toEqual(["a"]);
  });

  it("demo trends pass the rules and point at demo stories", () => {
    const demo = buildDemoContent(now);
    const ts = buildDemoTrends(demo.events, now);
    expect(ts.length).toBeGreaterThan(0);
    for (const t of ts) {
      expect(t.isDemo).toBe(true);
      expect(trendProblems(t, ts)).toEqual([]);
    }
  });

  it("slugifies names", () => {
    expect(slugify("Côte d'Ivoire: cocoa prices!")).toBe("cote-d-ivoire-cocoa-prices");
  });
});
