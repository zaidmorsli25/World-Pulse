import { describe, expect, it } from "vitest";
import { placeBadges } from "@/lib/client/quizBadges";

describe("quiz map letters", () => {
  it("moves the letter off a small country and keeps big ones centred", () => {
    const big = { id: "SAU", d: "", c: [300, 160] as [number, number], b: [[220, 100], [380, 230]] as [[number, number], [number, number]] };
    const kuwait = { id: "KWT", d: "", c: [262, 92] as [number, number], b: [[256, 86], [268, 98]] as [[number, number], [number, number]] };
    const [a, b] = placeBadges([big, kuwait], 520, 300);
    expect(a!.small).toBe(false);
    expect(a!.badge).toEqual([300, 160]);
    expect(b!.small).toBe(true);
    // the letter sits clearly outside Kuwait's outline, so it can't cover it
    const [bx, by] = b!.badge;
    expect(bx < 256 - 8 || bx > 268 + 8 || by < 86 - 8 || by > 98 + 8).toBe(true);
  });

  it("never stacks two letters on top of each other", () => {
    const tiny = (id: string, x: number, y: number) => ({ id, d: "", c: [x, y] as [number, number], b: [[x - 4, y - 4], [x + 4, y + 4]] as [[number, number], [number, number]] });
    const out = placeBadges([tiny("A", 100, 100), tiny("B", 104, 102), tiny("C", 98, 104)], 520, 300);
    for (let i = 0; i < out.length; i++)
      for (let j = i + 1; j < out.length; j++) expect(Math.hypot(out[i]!.badge[0] - out[j]!.badge[0], out[i]!.badge[1] - out[j]!.badge[1])).toBeGreaterThanOrEqual(20);
  });
});
