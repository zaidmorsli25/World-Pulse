import { describe, expect, it } from "vitest";
import { COUNTRY_PROFILES } from "@/data/countryProfiles";
import { buildDemoContent } from "@/data/demo/events";
import { FIGURE_IDS } from "@/data/figures";

describe("figure references", () => {
  it("every figure id used by country profiles and demo content exists", () => {
    const used: string[] = [];
    for (const p of Object.values(COUNTRY_PROFILES)) used.push(...([p.headOfState, p.headOfGovernment, ...(p.otherFigures ?? [])].filter(Boolean) as string[]));
    const demo = buildDemoContent(new Date("2026-11-27T00:00:00Z"));
    for (const e of demo.events) used.push(...e.figures, ...e.briefing.involved.filter((i) => i.kind === "figure" && i.ref).map((i) => i.ref!));
    for (const q of demo.quizzes) for (const x of q.questions) used.push(...(x.figureIds ?? []));
    expect(used.filter((id) => !FIGURE_IDS.has(id))).toEqual([]);
  });
});
